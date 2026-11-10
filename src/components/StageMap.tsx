import { useEffect, useMemo, useRef, useState } from "react";
import {
  CAMPAIGN_LAYERS,
  isStageUnlocked,
  layerForStage,
  stageIsComplete,
  stageProgress,
} from "../lib/campaign";
import type { Course } from "../types";

type StageMapProps = {
  course: Course;
  selectedIndex: number;
  solved: string[];
  completed: boolean;
  onSelect: (index: number) => void;
  disabled?: boolean;
};

const layerLabels = [
  { name: "外縁", difficulty: "入門" },
  { name: "中層", difficulty: "応用" },
  { name: "内層", difficulty: "上級" },
  { name: "核心", difficulty: "最難関" },
];

/** Both the radar and the list select the same saved campaign stage. */
export default function StageMap({
  course,
  selectedIndex,
  solved,
  completed,
  onSelect,
  disabled = false,
}: StageMapProps) {
  const selected = Math.max(
    0,
    Math.min(course.stages.length - 1, selectedIndex),
  );
  const selectedLayer = layerForStage(selected);
  const [filterLayer, setFilterLayer] = useState(selectedLayer);
  const listRef = useRef<HTMLOListElement>(null);
  const states = useMemo(
    () =>
      course.stages.map((_, index) => ({
        complete: stageIsComplete(index, course, solved),
        unlocked: isStageUnlocked(index, course, solved),
      })),
    [course, solved],
  );
  const progress = stageProgress(solved, course);
  const selectedStage = course.stages[selected];
  const points = useMemo(
    () =>
      course.stages.map((_, index) => {
        const layer = CAMPAIGN_LAYERS[layerForStage(index)];
        const slot = index - layer.start;
        const angle =
          ((slot + (layerForStage(index) % 2 ? 0.5 : 0)) / layer.count) *
          Math.PI *
          2;
        const radius = (layer.radius / CAMPAIGN_LAYERS[0].radius) * 70;
        return {
          x: 90 + Math.sin(angle) * radius,
          y: 90 + Math.cos(angle) * radius,
        };
      }),
    [course],
  );

  useEffect(() => setFilterLayer(selectedLayer), [selectedLayer]);
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>(
      `[data-stage-index="${selected}"]`,
    );
    if (!list || !current) return;
    // Scroll the small list rather than moving the entire page or sidebar.
    if (current.offsetTop < list.scrollTop) list.scrollTop = current.offsetTop;
    else if (
      current.offsetTop + current.offsetHeight >
      list.scrollTop + list.clientHeight
    )
      list.scrollTop =
        current.offsetTop + current.offsetHeight - list.clientHeight;
  }, [selected, filterLayer]);

  if (!selectedStage) return null;
  const choose = (index: number) => {
    if (!disabled && states[index]?.unlocked) onSelect(index);
  };
  const stateLabel = (index: number) =>
    states[index].complete
      ? "修復済み"
      : states[index].unlocked
        ? "挑戦可能"
        : "前の拠点を修復すると解放";
  const label = (index: number) => {
    const layer = layerLabels[layerForStage(index)];
    return `拠点${String(index + 1).padStart(2, "0")} ${course.stages[index].title} ${layer.name} ${layer.difficulty} ${stateLabel(index)}`;
  };
  const allRestored =
    completed && progress.completedStages === course.stages.length;

  return (
    <section className="stage-map" aria-label="54拠点のステージ選択">
      <div className="stage-map-heading">
        <span>STAGE NETWORK</span>
        <b>
          {String(progress.completedStages).padStart(2, "0")} /{" "}
          {course.stages.length}
        </b>
      </div>
      <div
        className="stage-map-radar"
        role="group"
        aria-label="外縁から核心へ進む円周マップ"
      >
        <svg viewBox="0 0 180 180" aria-hidden="true">
          <path className="stage-map-axis" d="M 90 9 V 171 M 9 90 H 171" />
          {CAMPAIGN_LAYERS.map((layer, index) => (
            <circle
              key={layer.start}
              className={`stage-map-orbit ${index === selectedLayer ? "current" : ""}`}
              cx="90"
              cy="90"
              r={(layer.radius / CAMPAIGN_LAYERS[0].radius) * 70}
            />
          ))}
          {points.slice(1).map((point, index) => (
            <path
              key={index}
              className={`stage-map-route ${states[index].complete ? "done" : ""}`}
              d={`M ${points[index].x} ${points[index].y} L ${point.x} ${point.y}`}
            />
          ))}
          <rect
            className={`stage-map-core ${allRestored ? "restored" : ""}`}
            x="86"
            y="86"
            width="8"
            height="8"
          />
          <path
            className="stage-map-core-cross"
            d="M 88 90 H 92 M 90 88 V 92"
          />
        </svg>
        {points.map((point, index) => (
          <button
            key={course.stages[index].id}
            type="button"
            className={`stage-map-node ${states[index].complete ? "done" : ""} ${states[index].unlocked ? "unlocked" : "locked"} ${index === selected ? "selected" : ""}`}
            style={{ left: `${point.x / 1.8}%`, top: `${point.y / 1.8}%` }}
            disabled={disabled || !states[index].unlocked}
            aria-label={label(index)}
            aria-current={index === selected ? "step" : undefined}
            title={label(index)}
            onClick={() => choose(index)}
          >
            <span aria-hidden="true">
              {index === selected
                ? index + 1
                : states[index].complete
                  ? "✓"
                  : ""}
            </span>
          </button>
        ))}
      </div>
      <p className="stage-map-status" aria-live="polite">
        {allRestored
          ? "中心のコアを復旧"
          : progress.completedStages === course.stages.length
            ? "全拠点を修復。コアを接続しよう。"
            : `中心まであと${course.stages.length - progress.completedStages}拠点`}
      </p>
      <div
        className="stage-map-layer-tabs"
        role="group"
        aria-label="難易度と層で絞り込む"
      >
        {layerLabels.map((layer, index) => (
          <button
            key={layer.name}
            type="button"
            className={index === filterLayer ? "selected" : ""}
            aria-pressed={index === filterLayer}
            onClick={() => setFilterLayer(index)}
          >
            {layer.name}
            <small>{layer.difficulty}</small>
          </button>
        ))}
      </div>
      <p className="stage-map-current">
        <span>現在の拠点 {String(selected + 1).padStart(2, "0")}</span>
        <b>{selectedStage.title}</b>
      </p>
      <ol
        className="stage-map-list"
        ref={listRef}
        aria-label={`${layerLabels[filterLayer].name}のステージ`}
      >
        {course.stages.map(
          (stage, index) =>
            layerForStage(index) === filterLayer && (
              <li key={stage.id} data-stage-index={index}>
                <button
                  type="button"
                  className={`${states[index].complete ? "done" : ""} ${index === selected ? "selected" : ""}`}
                  disabled={disabled || !states[index].unlocked}
                  aria-label={label(index)}
                  aria-current={index === selected ? "step" : undefined}
                  onClick={() => choose(index)}
                  title={label(index)}
                >
                  <span className="stage-map-list-number" aria-hidden="true">
                    {states[index].complete
                      ? "✓"
                      : String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="stage-map-list-title">
                    {stage.title}
                    <small>{stage.problems[0]?.concept}</small>
                  </span>
                  <span className="stage-map-list-state" aria-hidden="true">
                    {states[index].complete
                      ? "済"
                      : states[index].unlocked
                        ? "→"
                        : "▣"}
                  </span>
                </button>
              </li>
            ),
        )}
      </ol>
      <p className="stage-map-hint">
        拠点を順に修復すると次の拠点が開く。中心に近づくほど難しくなる。
      </p>
    </section>
  );
}
