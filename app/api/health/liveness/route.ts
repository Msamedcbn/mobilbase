export async function GET() {
  return Response.json(
    {
      status: "alive",
      now: new Date().toISOString(),
    },
    { status: 200 },
  );
}
