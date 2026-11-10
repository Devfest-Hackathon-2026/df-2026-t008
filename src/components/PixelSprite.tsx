/** Original 16×16 characters, drawn on an integer grid rather than scaled emoji. */
export default function PixelSprite({
  kind = "navi",
  color = "#ff4c25",
  className = "",
}: {
  kind?: "navi" | "player";
  color?: string;
  className?: string;
}) {
  const rows =
    kind === "navi"
      ? [
          ".......AA.......",
          ".......AA.......",
          "....BBBBBBBB....",
          "...BCCCCCCCCB...",
          "..BCCCCCCCCCCB..",
          "..BCDDCCCCDDCB..",
          "..BCDDCCCCDDCB..",
          "..BCCCCCCCCCCB..",
          "...BCCECCECCB...",
          "....BBBBBBBB....",
          "..AA.BBBBBB.AA..",
          "..AA.BCCCCB.AA..",
          ".....BBBBBB.....",
          ".....BB..BB.....",
          "....BBB..BBB....",
          "................",
        ]
      : [
          ".....BBBBBB.....",
          "....BBBBBBBB....",
          "....BCCCCCCB....",
          "....BCDBBDCB....",
          "....BCCCCCCB....",
          ".....BCCCB......",
          "...AAAAEAAAA....",
          "..AAAAAEAAAAA...",
          "..CAAAAEAAAAC...",
          "..CCAAAEAAACC...",
          "....AAAAAAA.....",
          "....BBBBBBB.....",
          "....BBB.BBB.....",
          "....BBB.BBB.....",
          "...BBBB.BBBB....",
          "................",
        ];
  const colors: Record<string, string> = {
    A: color,
    B: "#171b2e",
    C: kind === "navi" ? "#31dcf2" : "#ffdcaf",
    D: kind === "navi" ? "#171b2e" : "#171b2e",
    E: kind === "navi" ? "#ffffff" : "#ffffff",
  };
  return (
    <svg
      className={`pixel-sprite ${className}`}
      viewBox="0 0 16 16"
      width="48"
      height="48"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {rows.flatMap((row, y) =>
        [...row].map((p, x) =>
          p === "." ? null : (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width="1"
              height="1"
              fill={colors[p]}
            />
          ),
        ),
      )}
    </svg>
  );
}
