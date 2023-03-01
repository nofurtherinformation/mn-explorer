"use client";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import DeckGL from "@deck.gl/react/typed";
import { PMTLayer } from "@maticoapp/deck.gl-pmtiles";
import { ScatterplotLayer } from "@deck.gl/layers/typed";
import { MapboxOverlay, MapboxOverlayProps } from "@deck.gl/mapbox/typed";
//@ts-ignore
import Map, {
  NavigationControl,
  useControl,
  AttributionControl,
} from "react-map-gl";
import {
  // ConfigSpec,
  generateColorFunc,
  // BgTileLayer,
  INITIAL_VIEW_STATE,
  // generateExplicitColorFunc,
  // generateLabeledColorFunc,
} from "@/utils/utils";
import { ColorRange } from "@/components/ColorRange";
import "mapbox-gl/dist/mapbox-gl.css";
import { Deck } from "@deck.gl/core/typed";
import maplibre from "maplibre-gl";
import { mapVariables } from "@/config/MapVariables";
import { Tooltip, useTooltipStore } from "@/components/Tooltip";
import { tooltipColumns } from "@/config/TooltipColumns";
import type { PickingInfo } from "@deck.gl/core/typed";
import { choroplethOpacity } from "@/config/MapSettings";
import GeocoderControl from "@/components/Geocoder";
import Head from "next/head";

function DeckGLOverlay(
  props: MapboxOverlayProps & {
    interleaved?: boolean;
  }
) {
  const overlay = useControl<MapboxOverlay>(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

const styles = {
  streets: "mapbox://styles/dhalpern/cl8n48kzu000a15p9o8z7wjmb",
  satellite: "mapbox://styles/dhalpern/cldlspaaw000q01o091kg3q6e",
};

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

const REGION_URL =
  "https://d386ho3t0q1oea.cloudfront.net/region_map-2-10.pmtiles";
const BLOCK_URL =
  "https://d386ho3t0q1oea.cloudfront.net/africa_map-9-14_simp3.pmtiles";

const loadOptions = {
  pmt: {
    // workerUrl: '/node_modules/@loaders.gl/mvt/dist/mvt-worker.js',
    maxConcurrency:
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency - 1 : 3,
    maxMobileConcurrency:
      typeof navigator !== "undefined" ? navigator.hardwareConcurrency - 1 : 3,
    workerUrl:
      "https://unpkg.com/@maticoapp/deck.gl-pmtiles@0.0.14/dist/pmt-worker.js",
  },
};
const colors = [
  "#E8E7F4",
  "#CEC8DA",
  "#93328E",
  "#B83A85",
  "#D9477A",
  "#F25D6D",
  "#FB7962",
  "#FF9859",
  "#FFB857",
  "#FCD860",
  "#F9F871",
];

function toRgb(c: string) {
  if (c.length != 6) {
    throw "Only six-digit hex colors are allowed.";
  }

  var aRgbHex = c.match(/.{1,2}/g);
  var aRgb = [
    // @ts-ignore
    parseInt(aRgbHex[0], 16),
    // @ts-ignore
    parseInt(aRgbHex[1], 16),
    // @ts-ignore
    parseInt(aRgbHex[2], 16),
  ];
  return aRgb;
}

const kcomplexityColorScheme = [
  {
    value: 1,
    color: toRgb("E8E7F4"),
    label: "1",
  },
  {
    value: 2,
    color: toRgb("CEC8DA"),
    label: "2",
  },
  {
    value: 3,
    color: toRgb("93328E"),
    label: "3",
  },
  {
    value: 4,
    color: toRgb("B83A85"),
    label: "4",
  },
  {
    value: 5,
    color: toRgb("D9477A"),
    label: "5",
  },
  {
    value: 6,
    color: toRgb("F25D6D"),
    label: "6",
  },
  {
    value: 7,
    color: toRgb("FB7962"),
    label: "7",
  },
  {
    value: 8,
    color: toRgb("FF9859"),
    label: "8",
  },
  {
    value: 9,
    color: toRgb("FFB857"),
    label: "9",
  },
  {
    value: 10,
    color: toRgb("FCD860"),
    label: "10+",
  },
  // {
  //   value: 999,
  //   color: toRgb("F9F871"),
  //   label: "Off Network+",
  // },
];

export default function App() {
  const [variable, setVariable] = useState(mapVariables[0].name);
  const [tileContent, setTileContent] = useState({});
  const [z, setZ] = useState(INITIAL_VIEW_STATE.zoom);
  const [showSatellite, setShowSatellite] = useState(false);
  const [layersLoaded, setLayersLoaded] = useState({});
  const zTransitionLevel = 7;
  const numZfade = 4;
  const colorScale = "warm";
  const setTooltipInfo = useTooltipStore((state) => state.setTooltipInfo);
  // @ts-ignore
  const currSchema = useMemo(
    () => mapVariables.find((v) => v.name === variable) || mapVariables[0],
    [variable]
  );

  const mapStyle = showSatellite ? styles.satellite : styles.streets;
  const blocksColorFunc = useCallback(
    generateColorFunc(
      currSchema.colorMapping,
      currSchema.columnAccessors.blocks,
      currSchema.rangeType
    ),
    [currSchema]
  );

  const regionsColorFunc = useCallback(
    generateColorFunc(
      currSchema.colorMapping,
      currSchema.columnAccessors.region,
      currSchema.rangeType
    ),
    [currSchema]
  );

  const handleTooltipInfo = (info: PickingInfo) => {
    console.log(info?.object?.properties);
    info && setTooltipInfo(info);
  };

  const setLayerLoaded = (layer: string) => {
    setLayersLoaded((prev) => ({
      ...prev,
      [layer]: true,
    }));
  };

  const layers = [
    new PMTLayer({
      id: "regions-0-10-zoom",
      data: REGION_URL,
      onHover: handleTooltipInfo,
      minZoom: 2,
      maxZoom: 10,
      filled: true,
      // @ts-ignore
      getFillColor: (d) => {
        const c = regionsColorFunc(d);
        return [...c, z < 11 ? 255 : 0];
      },
      stroked: true,
      getLineColor: z > 11 ? [40, 40, 40, 255] : [0, 0, 0, 0],
      lineWidthMinPixels: 1,
      pickable: true,
      tileSize: 256,
      opacity: showSatellite ? 0.05 : choroplethOpacity,
      updateTriggers: {
        opacity: showSatellite,
        getFillColor: [z, regionsColorFunc],
      },
      onViewportLoad: () => setLayerLoaded("regions-0-10-zoom"),
      loadOptions,
      beforeId: "waterway-shadow",
    }),
    new PMTLayer({
      id: "blocks-9-14-zoom",
      data: BLOCK_URL,
      onHover: handleTooltipInfo,
      autoHighlight: true,
      highlightColor: [230, 230, 0, 255],
      // autoHighlight: true,
      minZoom: 10,
      maxZoom: 13,
      //@ts-ignore
      getFillColor: blocksColorFunc,
      lineWidthMinPixels: 1,
      pickable: true,
      stroked: false,
      tileSize: 256,
      opacity: showSatellite ? 0.05 : choroplethOpacity,
      onViewportLoad: () => setLayerLoaded("blocks-9-14-zoom"),
      updateTriggers: {
        getFillColor: [blocksColorFunc],
        opacity: [showSatellite],
      },
      loadOptions,
      beforeId: "waterway-shadow",
    }),
  ];
  // @ts-ignore
  const isLoaded = layers.every(({ id }) => layersLoaded[id]);

  return (
    <>
      <div
        className="w-full relative p-0 m-0"
        style={{ height: "calc(100vh - 64px)" }}
      >
        {!isLoaded && <Preloader />}

        <div className="dropdown absolute left-2 top-0 z-10 md:hidden">
          <label
            tabIndex={0}
            className="btn btn-circle drawer-button mt-2.5 ml-1 bg-white"
          >
            <svg viewBox="0 0 100 100" className="w-8 h-8">
              <path d="m80.816 66.781 2.8906-7.0391c0.77344-1.8789-0.12109-4.0352-2.0078-4.8125l-1.5977-0.65625c-1.8828-0.77344-3.25-2.7188-3.2539-4.3516-0.007812-1.6289 1.3516-3.582 3.2305-4.3633l1.5977-0.66406c1.8789-0.78125 2.7656-2.9414 1.9805-4.8203l-2.9297-7.0195c-0.78516-1.8789-2.9414-2.7656-4.8203-1.9844l-1.5977 0.66797c-1.8789 0.78516-4.2227 0.37891-5.375-0.77344-1.1562-1.1523-1.5742-3.4883-0.80078-5.3711l0.65625-1.5977c0.77344-1.8828-0.125-4.0391-2.0078-4.8125l-7.0352-2.8945c-1.8828-0.77344-4.0352 0.125-4.8086 2.0078l-0.65625 1.5977c-0.77344 1.8828-2.7188 3.2539-4.3516 3.2578-1.6289 0.003906-3.5781-1.3516-4.3633-3.2305l-0.66406-1.5977c-0.78516-1.8789-2.9414-2.7656-4.8242-1.9805l-7.0195 2.9297c-1.8789 0.78125-2.7656 2.9414-1.9805 4.8203l0.66406 1.5938c0.78516 1.8789 0.375 4.2188-0.77734 5.375-1.1484 1.1523-3.4883 1.5742-5.3711 0.80078l-1.5977-0.65625c-1.8828-0.77344-4.0352 0.125-4.8086 2.0078l-2.8945 7.0352c-0.77344 1.8828 0.125 4.0391 2.0078 4.8086l1.6016 0.66016c1.8828 0.77344 3.25 2.7148 3.2539 4.3477 0.003906 1.6289-1.3516 3.5781-3.2305 4.3633l-1.5977 0.66406c-1.8789 0.78516-2.7656 2.9414-1.9805 4.8203l2.9297 7.0195c0.78125 1.8828 2.9414 2.7695 4.8203 1.9844l1.5938-0.66406c1.8789-0.78125 4.2188-0.375 5.375 0.77344 1.1523 1.1523 1.5742 3.4883 0.80078 5.375l-0.65625 1.5938c-0.77344 1.8828 0.125 4.0391 2.0078 4.8125l7.0352 2.8906c1.8828 0.77344 4.0391-0.125 4.8125-2.0078l0.65625-1.5977c0.77344-1.8828 2.7148-3.2539 4.3477-3.2578 1.6289-0.007813 3.5781 1.3516 4.3633 3.2305l0.66406 1.5977c0.78516 1.8789 2.9414 2.7656 4.8242 1.9805l7.0195-2.9297c1.8789-0.78516 2.7656-2.9414 1.9805-4.8203l-0.66406-1.5977c-0.78516-1.8789-0.375-4.2227 0.77344-5.375 1.1523-1.1562 3.4883-1.5781 5.3711-0.80078l1.5977 0.65625c1.8867 0.78516 4.043-0.11328 4.8164-1.9961zm-36.199-3.6875c-7.2305-2.9727-10.684-11.246-7.7148-18.477 2.9766-7.2305 11.246-10.684 18.48-7.7109 7.2305 2.9727 10.684 11.246 7.7109 18.477-2.9727 7.2305-11.246 10.684-18.477 7.7109z" />
            </svg>
          </label>
          <ul
            tabIndex={0}
            className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 mt-2"
          >
            <ControlPanel
              mapVariables={mapVariables}
              setVariable={setVariable}
              showSatellite={showSatellite}
              setShowSatellite={setShowSatellite}
            />
          </ul>
        </div>
        <Map
          mapStyle={mapStyle}
          mapboxAccessToken={MAPBOX_TOKEN}
          maxBounds={[-50, -47, 80, 43]}
          reuseMaps={true}
          hash={true}
          onMoveEnd={(e) => {
            const z = e.viewState.zoom;
            setZ(Math.round(z));
          }}
          attributionControl={false}
        >
          <DeckGLOverlay layers={layers} interleaved={true} />
          {/* <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={layers}
        onViewStateChange={(e) => {
          const { zoom } = e.viewState;
          setZ(Math.round(zoom));
        }}
        /> */}
          <GeocoderControl
            mapboxAccessToken={MAPBOX_TOKEN}
            position="top-right"
          />
          <NavigationControl />
          <AttributionControl
            customAttribution={[
              "© The University of Chicago",
              "Data via Maxar Ecopia",
            ]}
          />
        </Map>
        <div className="absolute left-0 hidden bg-white bg-opacity-95 top-0 p-4 bottom-auto md:block">
          <ControlPanel
            mapVariables={mapVariables}
            setVariable={setVariable}
            showSatellite={showSatellite}
            setShowSatellite={setShowSatellite}
          />
        </div>

        <div className="absolute bottom-8 right-0 p-2 w-28 bg-white bg-opacity-90 md:left-0 md:right-auto md:p-4 md:w-auto">
          <h3 className="mb-2 text-md">{currSchema.name}</h3>
          <ColorRange
            // @ts-ignore
            colorScale={currSchema.colorMapping}
            // @ts-ignore
            rangeType={currSchema.rangeType}
          />
        </div>
        <Tooltip columns={tooltipColumns} />
      </div>
    </>
  );
}
const Preloader = () => (
  <div className="absolute w-full h-full top-0 left-0 bg-slate-50 z-20">
    <div className="flex flex-col align-middle justify-center items-center h-full w-full">
      <p>Map Loading</p>
      <progress className="progress w-56"></progress>
    </div>
  </div>
);
const ControlPanel: React.FC<{
  setVariable: React.Dispatch<React.SetStateAction<string>>;
  mapVariables: typeof mapVariables;
  showSatellite: boolean;
  setShowSatellite: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setVariable, mapVariables, showSatellite, setShowSatellite }) => {
  return (
    <>
      <label id="variable-label">Choose a variable:</label>
      <select
        aria-labelledby="variable-label"
        className="select select-sm w-full max-w-xs"
        onChange={(e) => setVariable(e.target.value)}
      >
        {mapVariables.map((f) => (
          <option value={f.name} key={f.name}>
            {f.name}
          </option>
        ))}
      </select>

      <div className="divider"></div>

      <div className="form-control">
        <label className="label cursor-pointer">
          <span className="label-text">Satellite Map</span>
          <input
            type="checkbox"
            className="toggle"
            checked={showSatellite}
            onChange={() => setShowSatellite((prev) => !prev)}
          />
        </label>
      </div>
    </>
  );
};