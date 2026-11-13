import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "sonner";
import { describe, expect, it } from "vitest";

import { ThemeProvider } from "@/hooks/useTheme";
import { PredictCar } from "@/pages/PredictCar";
import { makeRecord, optionsFixture } from "@/test/fixtures";
import {
  countCalls,
  installFetch,
  lastPostBody,
  type Routes,
} from "@/test/mockFetch";

function renderPredict(routes: Routes) {
  const fetchMock = installFetch(routes);
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/predict"]}>
        <PredictCar />
        <Toaster />
      </MemoryRouter>
    </ThemeProvider>,
  );
  return fetchMock;
}

describe("form validation", () => {
  it("rejects an empty form without calling the API", async () => {
    const user = userEvent.setup();
    const fetchMock = renderPredict({
      "GET /api/meta/options": { body: optionsFixture },
    });

    await screen.findByLabelText("Car price prediction form");
    await user.click(screen.getByRole("button", { name: "Predict Car Price" }));

    expect(await screen.findByText("Car name is required")).toBeInTheDocument();
    expect(screen.getByText("Manufacturing year is required")).toBeInTheDocument();
    expect(screen.getByText("Kilometers driven is required")).toBeInTheDocument();
    expect(screen.getByText("Select a fuel type")).toBeInTheDocument();
    expect(screen.getByText("Select a seller type")).toBeInTheDocument();
    expect(screen.getByText("Select a transmission type")).toBeInTheDocument();
    expect(screen.getByText("Select an owner type")).toBeInTheDocument();

    expect(countCalls(fetchMock, "POST", "/api/predict")).toBe(0);
  });

  it("flags an out-of-range year inline", async () => {
    const user = userEvent.setup();
    renderPredict({ "GET /api/meta/options": { body: optionsFixture } });

    await screen.findByLabelText("Car price prediction form");
    const year = screen.getByLabelText(/Manufacturing Year/);
    await user.type(year, "1500");
    await user.click(screen.getByRole("button", { name: "Predict Car Price" }));

    expect(
      await screen.findByText("Manufacturing year must be at least 1983"),
    ).toBeInTheDocument();
  });

  it("shows server-side field errors from a 422 response", async () => {
    const user = userEvent.setup();
    renderPredict({
      "GET /api/meta/options": { body: optionsFixture },
      "POST /api/predict": {
        status: 422,
        body: {
          detail: "Validation failed",
          errors: [
            { field: "year", message: "Year is outside the model's range" },
          ],
        },
      },
    });

    await screen.findByLabelText("Car price prediction form");
    await user.click(screen.getByRole("button", { name: "Load Sample Data" }));
    await user.click(screen.getByRole("button", { name: "Predict Car Price" }));

    expect(
      await screen.findByText("Year is outside the model's range"),
    ).toBeInTheDocument();
  });
});

describe("searchable car name", () => {
  it("filters dataset suggestions as you type and commits one", async () => {
    const user = userEvent.setup();
    renderPredict({ "GET /api/meta/options": { body: optionsFixture } });

    const input = await screen.findByPlaceholderText(
      "e.g. Maruti Swift Dzire VDI",
    );
    await user.click(input);
    await user.type(input, "swift");

    const listbox = await screen.findByRole("listbox", {
      name: "Car name suggestions",
    });
    expect(within(listbox).getByText("Maruti Swift VXI")).toBeInTheDocument();
    expect(within(listbox).getByText("Maruti Swift Dzire VDI")).toBeInTheDocument();
    expect(within(listbox).queryByText("Honda City i VTEC VX")).toBeNull();

    await user.click(within(listbox).getByText("Maruti Swift VXI"));
    expect(input).toHaveValue("Maruti Swift VXI");
  });
});

describe("prediction API integration", () => {
  it("loads sample data, shows the loading state and renders the real result", async () => {
    const user = userEvent.setup();

    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const fetchMock = renderPredict({
      "GET /api/meta/options": { body: optionsFixture },
      "POST /api/predict": async () => {
        await gate;
        return { body: makeRecord({ predicted_price: 511800.2445 }) };
      },
    });

    await screen.findByLabelText("Car price prediction form");
    await user.click(screen.getByRole("button", { name: "Load Sample Data" }));

    // Sample fills every required field from the notebook's evaluation row.
    expect(
      screen.getByLabelText<HTMLInputElement>(/Manufacturing Year/).value,
    ).toBe("2014");

    await user.click(screen.getByRole("button", { name: "Predict Car Price" }));

    // Loading indicator while the model runs.
    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("Running the trained model");
    expect(screen.getByRole("button", { name: /Predicting/ })).toBeDisabled();

    release?.();

    // Result shows the model's price, formatted in Indian currency.
    expect(await screen.findByText("Estimated resale value")).toBeInTheDocument();
    expect(await screen.findByText("₹5,11,800")).toBeInTheDocument();
    expect(
      screen.getByText(/₹5,11,800\.24 · model output/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Predict Another Car" }),
    ).toBeInTheDocument();

    // Payload carries real numbers, not strings.
    const body = lastPostBody<Record<string, unknown>>(
      fetchMock,
      "/api/predict",
    );
    expect(body).not.toBeNull();
    expect(body?.name).toBe("Maruti Swift Dzire VDI");
    expect(body?.year).toBe(2014);
    expect(body?.km_driven).toBe(145500);
    expect(body?.fuel).toBe("Diesel");
    expect(body?.mileage).toBe(23.4);
    expect(body?.engine).toBe(1248);
    expect(body?.seats).toBe(5);
    expect(typeof body?.car_age).not.toBe("string"); // derived server-side, not posted
  });

  it("surfaces an unreachable-backend error instead of failing silently", async () => {
    const user = userEvent.setup();
    const fetchMock = installFetch({
      "GET /api/meta/options": { body: optionsFixture },
    });
    // Simulate a network failure for the prediction call only.
    const original = fetchMock.getMockImplementation();
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).includes("/api/predict")) {
        throw new TypeError("Network down");
      }
      return original?.(input, init) as Promise<Response>;
    });

    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={["/predict"]}>
          <PredictCar />
          <Toaster />
        </MemoryRouter>
      </ThemeProvider>,
    );

    await screen.findByLabelText("Car price prediction form");
    await user.click(screen.getByRole("button", { name: "Load Sample Data" }));
    await user.click(screen.getByRole("button", { name: "Predict Car Price" }));

    expect(
      await screen.findByText("Prediction failed", undefined, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Estimated resale value")).toBeNull();
  });
});
