import { RouterProvider } from "react-router";
import { CivicProvider } from "../data/CivicContext";
import { router } from "./routes";

export default function App() {
  return (
    <CivicProvider>
      <RouterProvider router={router} />
    </CivicProvider>
  );
}
