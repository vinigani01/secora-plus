import {
  BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from "chart.js";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);
ChartJS.defaults.font.family = '"Public Sans", system-ui, sans-serif';
ChartJS.defaults.color = "#5B6F69";
