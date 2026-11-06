import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy URL — the live application now lives at /app/:id
export const Route = createFileRoute("/_authenticated/projects/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/run/$id", params: { id: params.id } });
  },
  component: () => null,
});
