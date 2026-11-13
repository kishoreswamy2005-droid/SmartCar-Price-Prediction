import {
  BarChart3,
  CarFront,
  History,
  House,
  Info,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: House,
    description: "KPIs and live charts",
  },
  {
    label: "Predict Price",
    href: "/predict",
    icon: CarFront,
    description: "Estimate a used-car price",
  },
  {
    label: "Prediction History",
    href: "/history",
    icon: History,
    description: "Search, filter and manage records",
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    description: "Dataset insights",
  },
  {
    label: "About & Model",
    href: "/about",
    icon: Info,
    description: "Model, dataset and metrics",
  },
];

export const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": {
    title: "Dashboard",
    subtitle: "Prediction KPIs and price analytics at a glance",
  },
  "/predict": {
    title: "Car Price Prediction",
    subtitle: "Enter vehicle details to get a model-backed estimate",
  },
  "/history": {
    title: "Prediction History",
    subtitle: "Search, sort and manage stored predictions",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Insights computed from the CarDekho dataset",
  },
  "/about": {
    title: "About & Model Information",
    subtitle: "How the model, dataset and metrics fit together",
  },
};
