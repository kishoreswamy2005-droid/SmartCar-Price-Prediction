import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FilterX,
  Loader2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebouncedValue } from "@/hooks/useDebounce";
import { ApiError } from "@/services/api";
import {
  clearHistory,
  deletePrediction,
  getFuelOptions,
  listPredictions,
} from "@/services/predictionService";
import type { PredictionListResponse, PredictionRecord } from "@/types";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatINR,
  formatKm,
  formatNumber,
  shortId,
} from "@/utils/format";

type SortField = "created_at" | "predicted_price" | "car_name" | "year" | "km_driven";
type SortDir = "asc" | "desc";

const PAGE_SIZES = [10, 25, 50];

function reasonMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : "The request failed.";
}

// ---------------------------------------------------------------------------
// Sortable column header
// ---------------------------------------------------------------------------
function SortableHeader({
  label,
  field,
  sortBy,
  sortDir,
  onSort,
  className,
  numeric = false,
}: {
  label: string;
  field: SortField;
  sortBy: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
  className?: string;
  numeric?: boolean;
}) {
  const active = sortBy === field;
  return (
    <TableHead
      className={cn(className && "text-left", numeric && "text-right")}
      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm uppercase tracking-wide transition-colors hover:text-foreground",
          numeric && "flex-row-reverse",
          active && "text-foreground",
        )}
        title={`Sort by ${label}`}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" aria-hidden="true" />
        )}
      </button>
    </TableHead>
  );
}

// ---------------------------------------------------------------------------
// Detail dialog
// ---------------------------------------------------------------------------
function DetailDialog({
  record,
  onClose,
}: {
  record: PredictionRecord | null;
  onClose: () => void;
}) {
  const details = record?.car_details;

  const rows: { label: string; value: string }[] = details
    ? [
        { label: "Car name", value: details.name },
        { label: "Manufacturing year", value: String(details.year) },
        { label: "Kilometers driven", value: formatKm(details.km_driven) },
        { label: "Fuel type", value: details.fuel },
        { label: "Seller type", value: details.seller_type },
        { label: "Transmission", value: details.transmission },
        { label: "Owner type", value: details.owner },
        { label: "Car age (2026)", value: `${details.car_age} years` },
        { label: "Mileage", value: details.mileage != null ? `${details.mileage} kmpl` : "—" },
        { label: "Engine", value: details.engine != null ? `${details.engine} cc` : "—" },
        { label: "Max power", value: details.max_power != null ? `${details.max_power} bhp` : "—" },
        { label: "Seats", value: details.seats != null ? String(details.seats) : "—" },
        { label: "Torque", value: details.torque || "—" },
        { label: "Predicted on", value: formatDateTime(record?.created_at) },
        { label: "Model", value: record?.model_name ?? "Linear Regression" },
      ]
    : [];

  return (
    <Dialog open={Boolean(record)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle>Prediction details</DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {record?.prediction_id}
          </DialogDescription>
        </DialogHeader>

        {record && details && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-primary/10 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Estimated value
              </p>
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {formatINR(record.predicted_price)}
              </p>
            </div>

            <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-3 border-b border-border/60 pb-1.5"
                >
                  <dt className="text-xs text-muted-foreground">{row.label}</dt>
                  <dd className="truncate text-right text-sm font-medium" title={row.value}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            {record.disclaimer && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {record.disclaimer}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function PredictionHistory() {
  const [data, setData] = useState<PredictionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [fuel, setFuel] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [fuelOptions, setFuelOptions] = useState<string[]>([]);
  const [detailRecord, setDetailRecord] = useState<PredictionRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PredictionRecord | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  // Debounced filter values keep the API calm while typing.
  const search = useDebouncedValue(searchInput, 350);
  const minPriceRaw = useDebouncedValue(minPriceInput, 450);
  const maxPriceRaw = useDebouncedValue(maxPriceInput, 450);
  const minPrice = minPriceRaw !== "" && Number.isFinite(Number(minPriceRaw)) ? Number(minPriceRaw) : null;
  const maxPrice = maxPriceRaw !== "" && Number.isFinite(Number(maxPriceRaw)) ? Number(maxPriceRaw) : null;

  // New filters always restart at page 1.
  useEffect(() => {
    setPage(1);
  }, [search, fuel, minPrice, maxPrice, pageSize]);

  const fetchFuelOptions = useCallback(() => {
    getFuelOptions()
      .then(setFuelOptions)
      .catch(() => {
        /* non-critical: filter keeps its fallback list */
      });
  }, []);

  useEffect(() => {
    fetchFuelOptions();
  }, [fetchFuelOptions]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listPredictions({
        page,
        page_size: pageSize,
        search: search || undefined,
        fuel: fuel || undefined,
        min_price: minPrice,
        max_price: maxPrice,
        sort_by: sortBy,
        sort_dir: sortDir,
      });
      setData(result);
      setError(null);
      setFilterError(null);
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) {
        setFilterError(reason.message);
      } else {
        setError(reasonMessage(reason));
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, fuel, minPrice, maxPrice, sortBy, sortDir]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
    })();
    return () => {
      cancelled = true;
      void cancelled;
    };
  }, [load]);

  const handleSort = (field: SortField) => {
    if (field === sortBy) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "car_name" || field === "year" ? "asc" : "desc");
    }
  };

  const hasFilters = search !== "" || fuel !== "" || minPrice !== null || maxPrice !== null;

  const clearFilters = () => {
    setSearchInput("");
    setFuel("");
    setMinPriceInput("");
    setMaxPriceInput("");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionBusy(true);
    try {
      await deletePrediction(deleteTarget.prediction_id);
      toast.success("Prediction deleted", {
        description: `${deleteTarget.car_details.name} removed from history.`,
      });
      setDeleteTarget(null);
      await load();
      fetchFuelOptions();
    } catch (reason) {
      toast.error("Could not delete", { description: reasonMessage(reason) });
    } finally {
      setActionBusy(false);
    }
  };

  const handleClear = async () => {
    setActionBusy(true);
    try {
      const result = await clearHistory();
      toast.success("History cleared", { description: `${result.count} records removed.` });
      setClearOpen(false);
      await load();
      fetchFuelOptions();
    } catch (reason) {
      toast.error("Could not clear history", { description: reasonMessage(reason) });
    } finally {
      setActionBusy(false);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 0;
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <Card className="no-print">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="relative flex-1">
              <Label htmlFor="history-search" className="mb-1.5 block text-[13px]">
                Search
              </Label>
              <Search
                className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="history-search"
                type="search"
                placeholder="Search by car name, ID, fuel…"
                className="pl-9"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[430px]">
              <div>
                <Label htmlFor="history-fuel" className="mb-1.5 block text-[13px]">
                  Fuel
                </Label>
                <Select value={fuel || undefined} onValueChange={(value) => setFuel(value)}>
                  <SelectTrigger id="history-fuel" className="w-full">
                    <SelectValue placeholder="All fuels" />
                  </SelectTrigger>
                  <SelectContent>
                    {(fuelOptions.length > 0
                      ? fuelOptions
                      : ["Petrol", "Diesel", "CNG", "LPG"]
                    ).map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="history-min" className="mb-1.5 block text-[13px]">
                  Min ₹
                </Label>
                <Input
                  id="history-min"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  value={minPriceInput}
                  onChange={(event) => setMinPriceInput(event.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="history-max" className="mb-1.5 block text-[13px]">
                  Max ₹
                </Label>
                <Input
                  id="history-max"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="Any"
                  value={maxPriceInput}
                  onChange={(event) => setMaxPriceInput(event.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              {hasFilters && (
                <Button type="button" variant="ghost" onClick={clearFilters}>
                  <FilterX className="h-4 w-4" />
                  Clear
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={total === 0 || actionBusy}
                onClick={() => setClearOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                Clear history
              </Button>
            </div>
          </div>

          {filterError && (
            <p className="text-sm font-medium text-destructive" role="alert">
              {filterError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Alert variant="destructive" className="no-print">
          <AlertTitle>Could not load prediction history</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error}
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              <Loader2 className="h-3.5 w-3.5" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="flex flex-col gap-3 p-4" aria-label="Loading history">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : total === 0 && !error ? (
            <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Search className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-base font-semibold">
                  {hasFilters ? "No matching predictions" : "No predictions yet"}
                </h2>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  {hasFilters
                    ? "Try different search terms or remove the active filters."
                    : "Run your first prediction and it will appear here automatically."}
                </p>
              </div>
              {hasFilters ? (
                <Button type="button" variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4" />
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/predict">Make a prediction</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[130px]">Prediction ID</TableHead>
                    <SortableHeader
                      label="Car Name"
                      field="car_name"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="min-w-[190px]"
                    />
                    <SortableHeader
                      label="Year"
                      field="year"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Kilometers"
                      field="km_driven"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="min-w-[120px]"
                    />
                    <TableHead>Fuel</TableHead>
                    <SortableHeader
                      label="Predicted Price"
                      field="predicted_price"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      numeric
                      className="min-w-[150px]"
                    />
                    <SortableHeader
                      label="Prediction Date"
                      field="created_at"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleSort}
                      className="min-w-[160px]"
                    />
                    <TableHead className="no-print text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                        <TableRow key={`skeleton-${index}`}>
                          {Array.from({ length: 8 }).map((__, cell) => (
                            <TableCell key={cell}>
                              <Skeleton className="h-5 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    : items.map((record) => (
                        <TableRow key={record.prediction_id}>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {shortId(record.prediction_id)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.car_details.name}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {record.car_details.year}
                          </TableCell>
                          <TableCell className="whitespace-nowrap tabular-nums">
                            {formatKm(record.car_details.km_driven)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="muted">{record.car_details.fuel}</Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                            {formatINR(record.predicted_price)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {formatDateTime(record.created_at)}
                          </TableCell>
                          <TableCell className="no-print">
                            <div className="flex justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View details for ${record.car_details.name}`}
                                title="View details"
                                onClick={() => setDetailRecord(record)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label={`Delete prediction for ${record.car_details.name}`}
                                title="Delete"
                                onClick={() => setDeleteTarget(record)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {!error && total > 0 && (
        <div className="no-print flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{startItem}</span>–
            <span className="font-medium text-foreground">{endItem}</span> of{" "}
            <span className="font-medium text-foreground">{formatNumber(total)}</span>{" "}
            predictions
            {hasFilters && " (filtered)"}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="page-size" className="text-xs text-muted-foreground">
                Rows
              </Label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setPageSize(Number(value))}
              >
                <SelectTrigger id="page-size" className="h-9 w-[74px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm tabular-nums text-muted-foreground">
                Page {page} of {Math.max(totalPages, 1)}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail dialog */}
      <DetailDialog record={detailRecord} onClose={() => setDetailRecord(null)} />

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this prediction?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  <span className="font-medium text-foreground">
                    {deleteTarget.car_details.name}
                  </span>{" "}
                  · {formatINR(deleteTarget.predicted_price)} ·{" "}
                  {formatDateTime(deleteTarget.created_at)}
                </>
              )}{" "}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionBusy}
              onClick={(event) => {
                // Keep the dialog open until the delete request resolves.
                event.preventDefault();
                void handleDelete();
              }}
            >
              {actionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear-history confirmation */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all prediction history?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {formatNumber(total)} stored predictions.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionBusy}
              onClick={(event) => {
                event.preventDefault();
                void handleClear();
              }}
            >
              {actionBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
