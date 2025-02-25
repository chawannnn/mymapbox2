import './App.css';
import mapboxgl from 'mapbox-gl';
import { useState, useEffect, useRef } from 'react';
import Supercluster from "supercluster";

mapboxgl.accessToken = 'pk.eyJ1IjoiY2hhd2FuMTMiLCJhIjoiY202cmg3MGNwMXQ2cTJqcTNmNjE1cjBnNCJ9.06eQJhm_HvYUmoxXD89eEA';
const LIMIT = 1000;
const API_URL = 'https://v2k-dev.vallarismaps.com/core/api/features/1.1/collections/658cd4f88a4811f10a47cea7/items?'
const API_KEY = 'bLNytlxTHZINWGt1GIRQBUaIlqz9X45XykLD83UkzIoN6PFgqbH7M7EDbsdgKVwC'


function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [geoData, setGeoData] = useState({ type: "FeatureCollection", features: [] });
  const [isLoading, setIsLoading] = useState(false);
  const supercluster = new Supercluster({
    radius: 60,
    maxZoom: 16,
    minZoom: 0,
  });

  useEffect(() => {
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [100.5018, 13.7563],
      zoom: 5,
      minZoom: 2
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
        id: "clusters",
        type: "circle",
        source: "cluster-source",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#ff6600",
          "circle-radius": [
            "step",
            ["get", "point_count"], 15, 100, 20, 750, 25,],
        },
      });

      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "cluster-source",
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-size": 12,
        },
      });

      map.current.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "cluster-source",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#ff0000",
          "circle-radius": 5,
        },
      });

      await loadGeoData()

      map.current.on("moveend", updateClusters);
    });


    return () => {
      if (map.current) map.current.remove();
    };
  }, []);


  const loadGeoData = async () => {
    setIsLoading(true)
    let offset = 0
    let i = 0
    let lastData = { type: "FeatureCollection", features: [] };

    while (offset < 100000) {
      const data = await fetchGeoJsonData(offset)
      await new Promise(resolve => setTimeout(resolve, 500));
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
    setIsLoading(false)
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
    console.log("🗺️ อัปเดต Cluster :", clusters.length);
  };

  const updateClusters = async () => {
    if (!map.current) return;

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
