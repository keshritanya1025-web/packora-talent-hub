import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/candidates")({
  head: () => ({ meta: [{ title: "Candidates — Packfora" }] }),
  component: () => <Outlet />,
});
