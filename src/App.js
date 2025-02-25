import './App.css';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useEffect, useRef } from 'react';
import Supercluster from "supercluster";

mapboxgl.accessToken = 'pk.eyJ1IjoiY2hhd2FuMTMiLCJhIjoiY202cmg3MGNwMXQ2cTJqcTNmNjE1cjBnNCJ9.06eQJhm_HvYUmoxXD89eEA';
const LIMIT = 2000;
const API_URL = 'https://v2k-dev.vallarismaps.com/core/api/features/1.1/collections/658cd4f88a4811f10a47cea7/items?'
const API_KEY = 'bLNytlxTHZINWGt1GIRQBUaIlqz9X45XykLD83UkzIoN6PFgqbH7M7EDbsdgKVwC'


function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [geoData, setGeoData] = useState({ type: "FeatureCollection", features: [] });
  const supercluster = new Supercluster({
    radius: 20,
    maxZoom: 16,
    minZoom: 3,
  });

  useEffect(() => {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [100.5018, 13.7563],
      zoom: 5,
      minZoom: 3
    });

    map.current.on("load", async () => {
      map.current.addSource("cluster-source", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
        // cluster: true,
        // clusterMaxZoom: 14,
        // clusterRadius: 50,
      });

      map.current.addLayer({
        id: "heatmap-layer",
        type: "heatmap",
        source: "cluster-source",
        maxzoom: 16,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "frp"], 0, 0.2, 10, 0.4, 50, 1.5, 100, 2.0],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 8, 2, 16, 3],
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0, "rgba(255,255,255,0)",
            0.2, "yellow",
            0.4, "orange",
            0.6, "red",
            0.8, "darkred"
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 30, 8, 20, 16, 10]
        }
      });

      map.current.on('click', 'heatmap-layer', (e) => {
        console.log(e)
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML("latitude : " + e.lngLat.lat + "</br>" + "longitude : " + e.lngLat.lng)
          .addTo(map.current);
      });
      loadGeoData()

      map.current.on("moveend", updateClusters);
    });


    return () => {
      if (map.current) map.current.remove();
    };
  }, []);


  const loadGeoData = async () => {
    let offset = 0
    let i = 0
    let lastData = { type: "FeatureCollection", features: [] };

    while (offset < 100000) {
      const data = await fetchGeoJsonData(offset)
      // await new Promise(resolve => setTimeout(resolve, 500));
      lastData.features = [...lastData.features, ...data.features]
      i++
      if (i === 5) {
        updateGeoJsonData(lastData)
        console.log("Update Data : ", lastData.features.length)
        i = 0
        // lastData = { type: "FeatureCollection", features: [] };
      }
      if (!data.features || data.features.length === 0) {
        console.log("ไม่พบข้อมูลเพิ่มเติมจาก API")
        break
      }
      offset += LIMIT;
    }
  }

  const fetchGeoJsonData = async (offset) => {
    try {
      const url = `${API_URL}api_key=${API_KEY}&limit=${LIMIT}&offset=${offset}`;
      console.log("Fetching viewport URL:", url);
      const response = await fetch(url);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching GeoJSON data:", error);
      return [];
    }
  };

  const updateGeoJsonData = (newData) => {
    const bounds = map.current.getBounds().toArray().flat(); // ดึง BBOX
    const zoom = Math.round(map.current.getZoom()); // ดึงค่า Zoom
    supercluster.load(newData.features);
    const clusters = supercluster.getClusters(bounds, zoom);

    if (map.current.getSource("cluster-source")) {
      map.current.getSource("cluster-source").setData({
        type: "FeatureCollection",
        features: clusters
      });
    }
    console.log("Cluster แสดงหลังอัพข้อมูล :", clusters.length);
  };

  const updateClusters = async () => {
    if (supercluster.points === undefined) return;

    const bounds = map.current.getBounds().toArray().flat(); // ดึง BBOX
    const zoom = Math.round(map.current.getZoom()); // ดึงค่า Zoom
    const clusters = supercluster.getClusters(bounds, zoom);

    if (map.current.getSource("cluster-source")) {
      map.current.getSource("cluster-source").setData({
        type: "FeatureCollection",
        features: clusters
      });
    }
    console.log("Cluster เมื่อขยับ : ", clusters.length);
  };

  return (
    <div id="map" ref={mapContainer} style={{ height: "100vh" }}></div>
  );
}

export default App;
