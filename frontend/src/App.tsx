import { Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/layout/AppShell";
import { AboutModel } from "@/pages/AboutModel";
import { Analytics } from "@/pages/Analytics";
import { Dashboard } from "@/pages/Dashboard";
import { NotFound } from "@/pages/NotFound";
import { PredictCar } from "@/pages/PredictCar";
import { PredictionHistory } from "@/pages/PredictionHistory";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/predict" element={<PredictCar />} />
        <Route path="/history" element={<PredictionHistory />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/about" element={<AboutModel />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
