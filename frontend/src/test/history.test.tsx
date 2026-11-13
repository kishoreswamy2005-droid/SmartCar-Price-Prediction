import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/hooks/useTheme";
import { PredictionHistory } from "@/pages/PredictionHistory";
import { makeList, makeRecord } from "@/test/fixtures";
import { installFetch, type Routes } from "@/test/mockFetch";
import type { PredictionRecord } from "@/types";

const recordA = makeRecord({
  prediction_id: "pred-aaaa1111bbbb",
  predicted_price: 511800.24,
});
const recordB = makeRecord({
  prediction_id: "pred-bbbb2222cccc",
  predicted_price: 950000,
  car_details: {
    ...makeRecord().car_details,
    name: "Hyundai Creta 1.6 CRDi SX",
    year: 2018,
    km_driven: 32000,
    car_age: 8,
  },
  created_at: "2026-03-02T08:00:00.000Z",
});

function callsContaining(
  fetchMock: { mock: { calls: unknown[][] } },
  fragment: string,
): unknown[][] {
  return fetchMock.mock.calls.filter((call) => {
    const url = String(call[0]);
    const method = String(
      (call[1] as RequestInit | undefined)?.method ?? "GET",
    ).toUpperCase();
    return method === fragment || url.includes(fragment);
  });
}

/** Assert a paragraph whose combined text (incl. child spans) contains needle. */
function paragraphContaining(needle: string) {
  return (_content: string, element: Element | null) =>
    element?.tagName.toLowerCase() === "p" &&
    (element.textContent ?? "").replace(/\s+/g, " ").includes(needle);
}

/** List route with server-side search / filter / sort / paging behaviour. */
function listRoute(records: PredictionRecord[], deleted: Set<string>) {
  return async (url: URL) => {
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const min = Number(url.searchParams.get("min_price") ?? 0);
    const max = Number(
      url.searchParams.get("max_price") ?? Number.MAX_SAFE_INTEGER,
    );
    const sortBy = url.searchParams.get("sort_by") ?? "created_at";
    const dir = url.searchParams.get("sort_dir") ?? "desc";
    const page = Number(url.searchParams.get("page") ?? 1);
    const pageSize = Number(url.searchParams.get("page_size") ?? 10);

    let items = records.filter(
      (record) =>
        !deleted.has(record.prediction_id) &&
        record.predicted_price >= min &&
        record.predicted_price <= max &&
        (search === "" ||
          record.car_details.name.toLowerCase().includes(search) ||
          record.prediction_id.toLowerCase().includes(search) ||
          record.car_details.fuel.toLowerCase().includes(search)),
    );

    items = [...items].sort((left, right) => {
      const dirFactor = dir === "asc" ? 1 : -1;
      switch (sortBy) {
        case "car_name":
          return (
            dirFactor *
            left.car_details.name.localeCompare(right.car_details.name)
          );
        case "year":
          return dirFactor * (left.car_details.year - right.car_details.year);
        case "predicted_price":
          return dirFactor * (left.predicted_price - right.predicted_price);
        default:
          return (
            dirFactor *
            (Date.parse(left.created_at) - Date.parse(right.created_at))
          );
      }
    });

    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
      body: makeList(items.slice(start, start + pageSize), {
        total,
        page,
        page_size: pageSize,
        total_pages: Math.max(1, Math.ceil(total / pageSize)),
      }),
    };
  };
}

function renderHistory(routes: Routes) {
  const fetchMock = installFetch(routes);
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/history"]}>
        <PredictionHistory />
        <Toaster />
      </MemoryRouter>
    </ThemeProvider>,
  );
  return fetchMock;
}

function routesWith(
  records: PredictionRecord[],
  deleted: Set<string>,
  extra: Routes = {},
): Routes {
  return {
    "GET /api/predictions/fuel-options": { body: ["Diesel", "Petrol"] },
    "GET /api/predictions": listRoute(records, deleted),
    "DELETE /api/predictions": async (url: URL) => {
      const id = url.pathname.replace("/api/predictions", "").replace(/^\//, "");
      if (id) deleted.add(id);
      else records.forEach((record) => deleted.add(record.prediction_id));
      return { body: { deleted: true } };
    },
    ...extra,
  };
}

describe("history table", () => {
  it("renders records with Indian currency and pagination summary", async () => {
    renderHistory(routesWith([recordA, recordB], new Set()));

    expect(await screen.findByText("Maruti Swift Dzire VDI")).toBeInTheDocument();
    expect(screen.getByText("Hyundai Creta 1.6 CRDi SX")).toBeInTheDocument();
    expect(screen.getByText("₹5,11,800")).toBeInTheDocument();
    expect(screen.getByText("₹9,50,000")).toBeInTheDocument();
    expect(screen.getByText(paragraphContaining("Showing 1–2 of 2"))).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("shows the empty state when nothing is stored", async () => {
    renderHistory(routesWith([], new Set()));

    expect(await screen.findByText("No predictions yet")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Make a prediction" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear history" })).toBeDisabled();
  });

  it("shows a retryable error state when the API fails", async () => {
    renderHistory(
      routesWith([recordA], new Set(), {
        "GET /api/predictions": { status: 500, body: { detail: "DB exploded" } },
      }),
    );

    expect(
      await screen.findByText("Could not load prediction history"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/ })).toBeInTheDocument();
    expect(screen.getByText("DB exploded")).toBeInTheDocument();
  });
});

describe("search and filters", () => {
  it("debounces search into the API request and filters the rows", async () => {
    const user = userEvent.setup();
    const fetchMock = renderHistory(routesWith([recordA, recordB], new Set()));

    await screen.findByText("Maruti Swift Dzire VDI");

    await user.type(
      screen.getByPlaceholderText("Search by car name, ID, fuel…"),
      "creta",
    );

    await waitFor(
      () => {
        expect(callsContaining(fetchMock, "search=creta")).toHaveLength(1);
      },
      { timeout: 4000 },
    );
    expect(
      await screen.findByText("Hyundai Creta 1.6 CRDi SX"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Maruti Swift Dzire VDI")).toBeNull();
    expect(screen.getByText(/predictions \(filtered\)/)).toBeInTheDocument();
  });

  it("sends the min-price filter to the API", async () => {
    const user = userEvent.setup();
    const fetchMock = renderHistory(routesWith([recordA, recordB], new Set()));

    await screen.findByText("Maruti Swift Dzire VDI");
    await user.type(screen.getByLabelText("Min ₹"), "900000");

    await waitFor(
      () => {
        expect(callsContaining(fetchMock, "min_price=900000")).toHaveLength(1);
      },
      { timeout: 4000 },
    );
    expect(
      await screen.findByText("Hyundai Creta 1.6 CRDi SX"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Maruti Swift Dzire VDI")).toBeNull();
  });
});

describe("sorting and pagination", () => {
  it("re-requests with the clicked sort field", async () => {
    const user = userEvent.setup();
    const fetchMock = renderHistory(routesWith([recordA, recordB], new Set()));

    await screen.findByText("Maruti Swift Dzire VDI");

    await user.click(screen.getByRole("button", { name: "Predicted Price" }));

    await waitFor(
      () => {
        expect(
          callsContaining(fetchMock, "sort_by=predicted_price"),
        ).toHaveLength(1);
      },
      { timeout: 4000 },
    );
  });

  it("pages through more records than one page holds", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 12 }, (_, index) =>
      makeRecord({
        prediction_id: `pred-${String(index + 1).padStart(4, "0")}xyz`,
        car_details: {
          ...makeRecord().car_details,
          name: `Test Car ${index + 1}`,
        },
        created_at: `2026-03-${String((index % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
      }),
    );
    const fetchMock = renderHistory(routesWith(many, new Set()));

    // Sorted newest-first: page 1 holds days 12…3, page 2 holds days 2…1.
    expect(await screen.findByText("Test Car 12")).toBeInTheDocument();
    expect(screen.queryByText("Test Car 1")).toBeNull();
    expect(
      screen.getByText(paragraphContaining("Showing 1–10 of 12")),
    ).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(
      () => {
        expect(callsContaining(fetchMock, "page=2")).toHaveLength(1);
      },
      { timeout: 4000 },
    );
    expect(await screen.findByText("Test Car 1")).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(
      screen.getByText(paragraphContaining("Showing 11–12 of 12")),
    ).toBeInTheDocument();
  });
});

describe("delete and clear", () => {
  it("deletes one record after explicit confirmation", async () => {
    const user = userEvent.setup();
    const deleted = new Set<string>();
    const fetchMock = renderHistory(routesWith([recordA, recordB], deleted));

    await screen.findByText("Maruti Swift Dzire VDI");

    await user.click(
      screen.getByRole("button", {
        name: "Delete prediction for Maruti Swift Dzire VDI",
      }),
    );

    expect(await screen.findByText("Delete this prediction?")).toBeInTheDocument();
    expect(
      screen.getByText(/This action cannot be undone/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(
      () => {
        expect(
          callsContaining(fetchMock, "DELETE").some((call) =>
            String(call[0]).includes("pred-aaaa1111bbbb"),
          ),
        ).toBe(true);
      },
      { timeout: 4000 },
    );
    expect(deleted.has("pred-aaaa1111bbbb")).toBe(true);
    expect(
      await screen.findByText("Hyundai Creta 1.6 CRDi SX"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Maruti Swift Dzire VDI")).toBeNull();
  });

  it("keeps the dialog open when the user cancels", async () => {
    const user = userEvent.setup();
    const deleted = new Set<string>();
    const fetchMock = renderHistory(routesWith([recordA], deleted));

    await screen.findByText("Maruti Swift Dzire VDI");
    await user.click(
      screen.getByRole("button", {
        name: "Delete prediction for Maruti Swift Dzire VDI",
      }),
    );
    await screen.findByText("Delete this prediction?");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByText("Delete this prediction?")).toBeNull();
    });
    expect(callsContaining(fetchMock, "DELETE")).toHaveLength(0);
    expect(screen.getByText("Maruti Swift Dzire VDI")).toBeInTheDocument();
  });

  it("clears all history after the destructive confirmation", async () => {
    const user = userEvent.setup();
    const deleted = new Set<string>();
    const fetchMock = renderHistory(routesWith([recordA, recordB], deleted));

    await screen.findByText("Maruti Swift Dzire VDI");

    await user.click(screen.getByRole("button", { name: "Clear history" }));
    expect(
      await screen.findByText("Clear all prediction history?"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Delete everything" }),
    );

    await waitFor(
      () => {
        expect(
          callsContaining(fetchMock, "DELETE").some(
            (call) => String(call[0]).endsWith("/api/predictions"),
          ),
        ).toBe(true);
      },
      { timeout: 4000 },
    );
    expect(await screen.findByText("No predictions yet")).toBeInTheDocument();
  });
});

describe("view details", () => {
  it("opens the detail dialog with the full record", async () => {
    const user = userEvent.setup();
    renderHistory(routesWith([recordA], new Set()));

    await screen.findByText("Maruti Swift Dzire VDI");
    await user.click(
      screen.getByRole("button", {
        name: "View details for Maruti Swift Dzire VDI",
      }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Prediction details")).toBeInTheDocument();
    expect(within(dialog).getByText("pred-aaaa1111bbbb")).toBeInTheDocument();
    expect(within(dialog).getByText("Estimated value")).toBeInTheDocument();
    expect(within(dialog).getByText("Maruti Swift Dzire VDI")).toBeInTheDocument();
  });
});
