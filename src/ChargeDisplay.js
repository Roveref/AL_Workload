import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  ComposedChart,
} from "recharts";
import * as XLSX from "xlsx";

// BearingPoint brand colors
const COLORS = [
  "#0076C8", // BearingPoint blue
  "#86BC25", // BearingPoint green
  "#FFBB28", // Amber
  "#FF8042", // Orange
  "#575756", // Gray
  "#003366", // Dark Blue
  "#E1F0FA", // Light Blue
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
];
const COLORS_SETUP = "#0076C8";    // BearingPoint blue
const COLORS_MONITOR = "#86BC25";  // BearingPoint green
const COLORS_RUN = "#FFBB28";      // Amber
const COLORS_FTE = "#FF7300";      // Orange for FTE line

const COLORS_MONTHS = [
  "#0076C8",
  "#E1F0FA",
  "#003366",
  "#86BC25",
  "#E5F2D3",
  "#575756",
  "#F2F2F2",
  "#FFBB28",
  "#FF8042",
  "#da70d6",
  "#9370db",
  "#8a2be2",
];

// Helper function to replace lodash orderBy
const orderBy = (array, key, order) => {
  return [...array].sort((a, b) => {
    if (order[0] === "desc") {
      return b[key] - a[key];
    } else {
      return a[key] - b[key];
    }
  });
};

const ChargeDisplay = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [workPackageData, setWorkPackageData] = useState([]);
  const [roleData, setRoleData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [wpMonthlyData, setWpMonthlyData] = useState([]);
  const [wpHierarchy, setWpHierarchy] = useState({});
  const [weeklyData, setWeeklyData] = useState([]);
  const [totals, setTotals] = useState({});
  const [activeTab, setActiveTab] = useState("overview");
  const [activeWP, setActiveWP] = useState("WP1");
  const [mainWPs, setMainWPs] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [fileInput, setFileInput] = useState(null);

  const handleFileUpload = async (event) => {
    try {
      setIsLoading(true);
      setFileError(null);

      const file = event.target.files[0];
      if (!file) {
        setFileError("Aucun fichier sélectionné");
        setIsLoading(false);
        return;
      }

      setFileInput(file);
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          processExcelData(data);
        } catch (error) {
          console.error("Erreur lors du traitement du fichier:", error);
          setFileError(
            `Erreur lors du traitement du fichier: ${error.message}`
          );
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setFileError("Erreur lors de la lecture du fichier");
        setIsLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Erreur lors du téléchargement du fichier:", error);
      setFileError(
        `Erreur lors du téléchargement du fichier: ${error.message}`
      );
      setIsLoading(false);
    }
  };

  const processExcelData = (response) => {
    try {
      const workbook = XLSX.read(response, {
        cellStyles: true,
        cellFormulas: true,
        cellDates: true,
        cellNF: true,
        sheetStubs: true,
      });

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
      });

      // Important: The first two rows are headers, so we need to start processing from row 3
      // This means we need to adjust our index from i=3 (which we had before) to i=2 (0-based index for the 3rd row)
      const HEADER_ROWS = 1; // Number of header rows to skip
      const DATA_START_ROW = HEADER_ROWS; // Data starts right after the header rows (0-based index)

      // Identifier les Work Packages et rôles
      const allWorkPackages = [
        "1.1 Program Charter",
        "1.2 Standardized Templates",
        "1.3 Communication and Training Material",
        "2.1 Integrated Program Roadmap",
        "2.2 Work Breakdown Structure",
        "2.3 Critical Path Analysis",
        "2.4 Planning Progress Reports",
        "3.1 Interface Management Framework",
        "3.2 RACI Matrix",
        "3.3 Dependency Map",
        "4.1 Governance Model",
        "4.2 Risk Register",
        "4.3 Updated Risk Review Committees",
        "4.4 Decision Logs and Action Tracker",
        "4.5 KPI and OKR Dashboard",
        "4.6 Governance Assessment Reports",
        "5.1 Document Management Strategy",
        "5.2 Quality Assurance Plan",
        "5.3 Documentation Templates",
        "5.4 Deliverables Review Checklist",
        "5.5 Compliance and Audit Reports",
        "6.1 Benefits Realization Plan",
        "6.2 Financial Tracking Reports",
        "6.3 Non-Financial KPI Dashboards",
        "6.4 Cost-Benefit Analysis Reports",
        "6.5 Benefits Realization Review",
        "7.1 Workshop Agendas and Objectives",
        "7.2 Facilitation Materials",
        "7.3 Workshop Summary Reports",
        "7.4 Pulse Survey Analysis",
        "8.1 Executive Briefing Packs",
        "8.2 Strategic Decision Support Reports",
        "8.3 Risk Resolution Summaries",
        "8.4 Ad-Hoc Executive Reports",
      ];

      // Lignes de synthèse (à ne pas inclure dans les calculs)
      const summaryWPs = [
        "WP1",
        "WP2",
        "WP3",
        "WP4",
        "WP5",
        "WP6",
        "WP7",
        "WP8",
      ];
      setMainWPs(summaryWPs);

      // Pour l'affichage de la hiérarchie, nous avons besoin des deux
      const workPackages = [...summaryWPs, ...allWorkPackages];

      const roles = [
        "PMO Lead",
        "Partners",
        "Program Deputy",
        "Core Team 2 Change",
        "Core Team 2 Process",
        "SAP Expert",
        "Aveva Expert",
        "PPM Expert",
        "SA Expert",
        "Digital Consistency Expert",
        "Change Expert",
      ];

      // Mois disponibles with years included
      const months = [
        { month: "Jun 2025", column: 42 },
        { month: "Jul 2025", column: 47 },
        { month: "Aug 2025", column: 52 },
        { month: "Sep 2025", column: 57 },
        { month: "Oct 2025", column: 62 },
        { month: "Nov 2025", column: 67 },
        { month: "Dec 2025", column: 72 },
        { month: "Jan 2026", column: 77 },
        { month: "Feb 2026", column: 82 },
        { month: "Mar 2026", column: 87 },
        { month: "Apr 2026", column: 92 },
        { month: "May 2026", column: 97 },
      ];

      // 1. Calculer la charge totale par WP (uniquement les sous-WPs, pas les WPs de synthèse)
      let wpData = [];

      // D'abord calculer les sous-WPs
      for (let wp of allWorkPackages) {
        let setup = 0;
        let monitor = 0;
        let run = 0;

        // Start from DATA_START_ROW instead of hardcoded index 3
        for (let i = DATA_START_ROW; i < data.length; i++) {
          if (data[i] && data[i][0] === wp) {
            if (data[i][2]) setup += data[i][2];
            if (data[i][3]) monitor += data[i][3];
            if (data[i][4]) run += data[i][4];
          }
        }

        wpData.push({
          workPackage: wp,
          setup: parseFloat(setup.toFixed(2)),
          monitor: parseFloat(monitor.toFixed(2)),
          run: parseFloat(run.toFixed(2)),
          total: parseFloat((setup + monitor + run).toFixed(2)),
        });
      }

      // Ensuite calculer les totaux pour les WPs de synthèse
      for (let mainWP of summaryWPs) {
        const wpNumber = mainWP.replace("WP", "");
        const subWPs = allWorkPackages.filter((wp) =>
          wp.startsWith(wpNumber + ".")
        );

        let setup = 0;
        let monitor = 0;
        let run = 0;

        subWPs.forEach((subWP) => {
          const subWPData = wpData.find((data) => data.workPackage === subWP);
          if (subWPData) {
            setup += subWPData.setup;
            monitor += subWPData.monitor;
            run += subWPData.run;
          }
        });

        wpData.push({
          workPackage: mainWP,
          setup: parseFloat(setup.toFixed(2)),
          monitor: parseFloat(monitor.toFixed(2)),
          run: parseFloat(run.toFixed(2)),
          total: parseFloat((setup + monitor + run).toFixed(2)),
        });
      }

      setWorkPackageData(wpData);

      // 2. Calculer la charge totale par rôle
      let roleDataCalc = [];
      for (let role of roles) {
        let setup = 0;
        let monitor = 0;
        let run = 0;

        // Start from DATA_START_ROW instead of hardcoded index 3
        for (let i = DATA_START_ROW; i < data.length; i++) {
          // Exclure les lignes de synthèse
          if (
            data[i] &&
            data[i][1] === role &&
            !summaryWPs.includes(data[i][0])
          ) {
            if (data[i][2]) setup += data[i][2];
            if (data[i][3]) monitor += data[i][3];
            if (data[i][4]) run += data[i][4];
          }
        }

        roleDataCalc.push({
          role: role,
          setup: parseFloat(setup.toFixed(2)),
          monitor: parseFloat(monitor.toFixed(2)),
          run: parseFloat(run.toFixed(2)),
          total: parseFloat((setup + monitor + run).toFixed(2)),
        });
      }
      setRoleData(roleDataCalc);

      // 3. Distribution des charges mensuelles - en utilisant uniquement les données des sous-WPs
      let monthlyDataCalc = [];
      for (let monthObj of months) {
        let total = 0;
        let weekCount = 0;

        // Pour chaque mois, utiliser les 4 semaines correspondantes
        for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
          const weekIndex = monthObj.column + weekOffset;
          let weekTotal = 0;
          
          // Start from DATA_START_ROW instead of hardcoded index 3
          for (let i = DATA_START_ROW; i < data.length; i++) {
            // Ne prendre en compte que les lignes qui ne sont pas des WPs de synthèse
            if (
              data[i] &&
              !summaryWPs.includes(data[i][0]) &&
              data[i][weekIndex] !== null &&
              data[i][weekIndex] !== undefined
            ) {
              weekTotal += data[i][weekIndex];
            }
          }
          
          if (weekTotal > 0) {
            total += weekTotal;
            weekCount++;
          }
        }

        // Calculate average FTE for the month
        // If we have data for this month
        const avgWeeklyCharge = weekCount > 0 ? total / weekCount : 0;
        const ftePercentage = (avgWeeklyCharge / 5) * 100; // 5 days per week for 100% FTE

        monthlyDataCalc.push({
          month: monthObj.month,
          total: parseFloat(total.toFixed(2)),
          ftePercentage: parseFloat(ftePercentage.toFixed(1))
        });
      }
      setMonthlyData(monthlyDataCalc);

      // 4. Distribution des charges par Work Package et par mois - excluant les WPs de synthèse dans les calculs
      let wpMonthlyDataCalc = [];

      // D'abord calculer pour les sous-WPs
      for (let wp of allWorkPackages) {
        let wpRow = { workPackage: wp };

        for (let monthObj of months) {
          let total = 0;

          // Pour chaque mois, utiliser les 4 semaines correspondantes
          for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
            const weekIndex = monthObj.column + weekOffset;

            // Start from DATA_START_ROW instead of hardcoded index 3
            for (let i = DATA_START_ROW; i < data.length; i++) {
              if (
                data[i] &&
                data[i][0] === wp &&
                data[i][weekIndex] !== null &&
                data[i][weekIndex] !== undefined
              ) {
                total += data[i][weekIndex];
              }
            }
          }

          wpRow[monthObj.month] = parseFloat(total.toFixed(2));
        }

        wpMonthlyDataCalc.push(wpRow);
      }

      // Ensuite calculer les totaux pour les WPs de synthèse
      for (let mainWP of summaryWPs) {
        const wpNumber = mainWP.replace("WP", "");
        const subWPs = allWorkPackages.filter((wp) =>
          wp.startsWith(wpNumber + ".")
        );

        let wpRow = { workPackage: mainWP };

        for (let monthObj of months) {
          let total = 0;

          // Additionner les valeurs des sous-WPs pour ce mois
          subWPs.forEach((subWP) => {
            const subWPData = wpMonthlyDataCalc.find(
              (data) => data.workPackage === subWP
            );
            if (subWPData && subWPData[monthObj.month]) {
              total += subWPData[monthObj.month];
            }
          });

          wpRow[monthObj.month] = parseFloat(total.toFixed(2));
        }

        wpMonthlyDataCalc.push(wpRow);
      }

      setWpMonthlyData(wpMonthlyDataCalc);

      // 5. Hiérarchie des Work Packages
      let wpHierarchyCalc = {};

      for (let wp of workPackages) {
        if (summaryWPs.includes(wp)) {
          wpHierarchyCalc[wp] = {
            main: wp,
            subWPs: [],
          };
        } else {
          const wpNumber = wp.split(".")[0];
          const mainWP = "WP" + wpNumber;
          if (wpHierarchyCalc[mainWP]) {
            wpHierarchyCalc[mainWP].subWPs.push(wp);
          }
        }
      }
      setWpHierarchy(wpHierarchyCalc);
      setActiveWP(summaryWPs[0]);

      // 6. Charge hebdomadaire - sans inclure les lignes de synthèse
      let weeklyDataCalc = [];
      for (let week = 38; week < 178; week++) {
        let weekNumber = week - 37;
        let total = 0;

        // Start from DATA_START_ROW instead of hardcoded index 3
        for (let i = DATA_START_ROW; i < data.length; i++) {
          if (
            data[i] &&
            !summaryWPs.includes(data[i][0]) &&
            data[i][week] !== null &&
            data[i][week] !== undefined
          ) {
            total += data[i][week];
          }
        }

        weeklyDataCalc.push({
          week: weekNumber,
          total: parseFloat(total.toFixed(2)),
          // Add FTE percentage
          ftePercentage: parseFloat(((total / 5) * 100).toFixed(1))
        });
      }
      setWeeklyData(weeklyDataCalc);

      // 7. Totaux généraux - sans inclure les lignes de synthèse
      let totalSetup = 0;
      let totalMonitor = 0;
      let totalRun = 0;

      // Start from DATA_START_ROW instead of hardcoded index 3
      for (let i = DATA_START_ROW; i < data.length; i++) {
        if (data[i] && !summaryWPs.includes(data[i][0])) {
          if (data[i][2]) totalSetup += data[i][2];
          if (data[i][3]) totalMonitor += data[i][3];
          if (data[i][4]) totalRun += data[i][4];
        }
      }

      setTotals({
        totalSetup: parseFloat(totalSetup.toFixed(2)),
        totalMonitor: parseFloat(totalMonitor.toFixed(2)),
        totalRun: parseFloat(totalRun.toFixed(2)),
        grandTotal: parseFloat(
          (totalSetup + totalMonitor + totalRun).toFixed(2)
        ),
      });

      setIsLoading(false);
    } catch (error) {
      console.error("Erreur lors du traitement des données Excel:", error);
      setFileError(
        `Erreur lors du traitement des données Excel: ${error.message}`
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Au lieu de charger automatiquement, nous attendons que l'utilisateur
    // télécharge le fichier
    setIsLoading(false);
  }, []);

  // Format des nombres
  const formatNumber = (num) => {
    return new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(num);
  };

  // Fonction pour obtenir les sous-WPs d'un WP principal
  const getSubWPsData = (mainWP) => {
    if (!wpHierarchy[mainWP]) return [];
    return workPackageData.filter((wp) =>
      wpHierarchy[mainWP].subWPs.includes(wp.workPackage)
    );
  };

  // Fonction pour obtenir la répartition mensuelle d'un WP principal
  const getWpMonthlyChartData = (mainWP) => {
    const mainWpData = wpMonthlyData.find((wp) => wp.workPackage === mainWP);
    if (!mainWpData) return [];

    const monthsWithYears = [
      "Jun 2025",
      "Jul 2025",
      "Aug 2025",
      "Sep 2025",
      "Oct 2025",
      "Nov 2025",
      "Dec 2025",
      "Jan 2026",
      "Feb 2026",
      "Mar 2026",
      "Apr 2026",
      "May 2026",
    ];
    
    return monthsWithYears.map((month) => ({
      month,
      charge: mainWpData[month] || 0,
    }));
  };

  // Fonction pour obtenir les données temporelles d'un WP principal et ses sous-WPs
  const getWpDetailedMonthlyData = (mainWP) => {
    if (!wpHierarchy[mainWP]) return [];

    const allWps = [mainWP, ...wpHierarchy[mainWP].subWPs];
    const monthsWithYears = [
      "Jun 2025",
      "Jul 2025",
      "Aug 2025",
      "Sep 2025",
      "Oct 2025",
      "Nov 2025",
      "Dec 2025",
      "Jan 2026",
      "Feb 2026",
      "Mar 2026",
      "Apr 2026",
      "May 2026",
    ];

    return monthsWithYears.map((month) => {
      const monthData = { month };

      allWps.forEach((wp) => {
        const wpData = wpMonthlyData.find((item) => item.workPackage === wp);
        if (wpData) {
          monthData[wp] = wpData[month] || 0;
        }
      });

      return monthData;
    });
  };

  // Si aucun fichier n'a été chargé, afficher l'interface de téléchargement
  if (!fileInput && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <h1>Dashboard de charge de travail</h1>
        <div className="chart-container" style={{maxWidth: "400px"}}>
          <h2>Veuillez télécharger votre fichier Excel</h2>
          <p style={{marginBottom: "20px", color: "#666"}}>
            Pour visualiser le dashboard, veuillez télécharger votre fichier
            AL_Charge.xlsx
          </p>

          <div className="flex flex-col items-center">
            <label
              htmlFor="excel-upload"
              className="wp-button active"
              style={{width: "100%", textAlign: "center", marginBottom: "16px", cursor: "pointer"}}
            >
              Sélectionner un fichier Excel
            </label>
            <input
              id="excel-upload"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{display: "none"}}
            />

            {fileError && (
              <div style={{
                marginTop: "16px", 
                padding: "12px", 
                backgroundColor: "#ffebee", 
                color: "#c62828",
                borderRadius: "4px",
                width: "100%"
              }}>
                {fileError}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div style={{padding: "20px"}}>
      <h1>Dashboard de charge de travail</h1>

      {/* Statistiques globales */}
      <div className="stats-container">
        <div className="stat-card total">
          <h3>Charge totale</h3>
          <div className="value">{formatNumber(totals.grandTotal)} j/h</div>
        </div>
        <div className="stat-card setup">
          <h3>Setup</h3>
          <div className="value">{formatNumber(totals.totalSetup)} j/h</div>
          <div className="percentage">
            ({((totals.totalSetup / totals.grandTotal) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="stat-card monitor">
          <h3>Monitor</h3>
          <div className="value">{formatNumber(totals.totalMonitor)} j/h</div>
          <div className="percentage">
            ({((totals.totalMonitor / totals.grandTotal) * 100).toFixed(1)}%)
          </div>
        </div>
        <div className="stat-card run">
          <h3>Run</h3>
          <div className="value">{formatNumber(totals.totalRun)} j/h</div>
          <div className="percentage">
            ({((totals.totalRun / totals.grandTotal) * 100).toFixed(1)}%)
          </div>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Vue d'ensemble
        </button>
        <button
          className={`tab ${activeTab === "wp" ? "active" : ""}`}
          onClick={() => setActiveTab("wp")}
        >
          Work Packages
        </button>
        <button
          className={`tab ${activeTab === "roles" ? "active" : ""}`}
          onClick={() => setActiveTab("roles")}
        >
          Rôles
        </button>
        <button
          className={`tab ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Évolution temporelle
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === "overview" && (
        <div>
          <div className="charts-row">
            {/* Répartition globale par type d'activité */}
            <div className="chart-container">
              <h2>Répartition par type d'activité</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Setup", value: totals.totalSetup },
                      { name: "Monitor", value: totals.totalMonitor },
                      { name: "Run", value: totals.totalRun },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                  >
                    <Cell fill={COLORS_SETUP} />
                    <Cell fill={COLORS_MONITOR} />
                    <Cell fill={COLORS_RUN} />
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatNumber(value) + " j/h"}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 des Work Packages par charge totale */}
            <div className="chart-container">
              <h2>Top Work Packages principaux par charge</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={orderBy(
                    workPackageData.filter((wp) =>
                      mainWPs.includes(wp.workPackage)
                    ),
                    "total",
                    ["desc"]
                  )}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="workPackage" />
                  <YAxis tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value) => formatNumber(value) + " j/h"}
                  />
                  <Legend />
                  <Bar dataKey="setup" name="Setup" fill={COLORS_SETUP} />
                  <Bar dataKey="monitor" name="Monitor" fill={COLORS_MONITOR} />
                  <Bar dataKey="run" name="Run" fill={COLORS_RUN} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="charts-row">
            {/* Distribution mensuelle de la charge */}
            <div className="chart-container">
              <h2>Distribution mensuelle de la charge</h2>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                    padding={{ left: 5, right: 5 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    tickFormatter={(value) => formatNumber(value)} 
                    label={{ value: 'Charge (j/h)', angle: -90, position: 'insideLeft' }} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 100]} 
                    tickFormatter={(value) => `${value}%`}
                    label={{ value: 'FTE Moyen (%)', angle: 90, position: 'insideRight' }} 
                  />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === "Charge totale") return formatNumber(value) + " j/h";
                      if (name === "FTE Moyen") return value + "%";
                      return value;
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="total"
                    name="Charge totale"
                    fill="#8884d8"
                    stroke="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="ftePercentage"
                    name="FTE Moyen"
                    stroke={COLORS_FTE}
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 des rôles par charge totale */}
            <div className="chart-container">
              <h2>Top Rôles par charge</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={orderBy(roleData, "total", ["desc"]).slice(0, 5)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="role" />
                  <YAxis tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value) => formatNumber(value) + " j/h"}
                  />
                  <Legend />
                  <Bar dataKey="setup" name="Setup" fill={COLORS_SETUP} />
                  <Bar dataKey="monitor" name="Monitor" fill={COLORS_MONITOR} />
                  <Bar dataKey="run" name="Run" fill={COLORS_RUN} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Courbe de charge hebdomadaire avec FTE */}
          <div className="chart-container">
            <h2>Évolution de la charge hebdomadaire</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={weeklyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis 
                  yAxisId="left" 
                  tickFormatter={(value) => formatNumber(value)} 
                  label={{ value: 'Charge (j/h)', angle: -90, position: 'insideLeft' }} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'FTE (%)', angle: 90, position: 'insideRight' }} 
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "Charge hebdomadaire") return formatNumber(value) + " j/h";
                    if (name === "FTE") return value + "%";
                    return value;
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  name="Charge hebdomadaire"
                  fill="#8884d8"
                  stroke="#8884d8"
                  fillOpacity={0.6}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ftePercentage"
                  name="FTE"
                  stroke={COLORS_FTE}
                  dot={false}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "wp" && (
        <div>
          {/* Sélection du Work Package */}
          <div className="wp-selector">
            {mainWPs.map((wp) => (
              <button
                key={wp}
                className={`wp-button ${activeWP === wp ? "active" : ""}`}
                onClick={() => setActiveWP(wp)}
              >
                {wp}
              </button>
            ))}
          </div>

          <div className="charts-row">
            {/* Détails du Work Package sélectionné */}
            <div className="chart-container">
              <h2>{activeWP} - Répartition par type</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workPackageData
                      .filter((wp) => wp.workPackage === activeWP)
                      .map((wp) => [
                        { name: "Setup", value: wp.setup },
                        { name: "Monitor", value: wp.monitor },
                        { name: "Run", value: wp.run },
                      ])
                      .flat()}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                  >
                    <Cell fill={COLORS_SETUP} />
                    <Cell fill={COLORS_MONITOR} />
                    <Cell fill={COLORS_RUN} />
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatNumber(value) + " j/h"}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Évolution mensuelle du WP */}
            <div className="chart-container">
              <h2>{activeWP} - Évolution mensuelle</h2>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={getWpMonthlyChartData(activeWP)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80} 
                  />
                  <YAxis tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value) => formatNumber(value) + " j/h"}
                  />
                  <Area
                    type="monotone"
                    dataKey="charge"
                    name="Charge"
                    fill="#8884d8"
                    stroke="#8884d8"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sous-Work Packages */}
          <div className="chart-container">
            <h2>{activeWP} - Sous-Work Packages</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={getSubWPsData(activeWP)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="workPackage" />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip formatter={(value) => formatNumber(value) + " j/h"} />
                <Legend />
                <Bar dataKey="setup" name="Setup" fill={COLORS_SETUP} />
                <Bar dataKey="monitor" name="Monitor" fill={COLORS_MONITOR} />
                <Bar dataKey="run" name="Run" fill={COLORS_RUN} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Évolution détaillée par mois pour le WP et ses sous-WPs */}
          <div className="chart-container">
            <h2>{activeWP} - Évolution détaillée par sous-WP</h2>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart
                data={getWpDetailedMonthlyData(activeWP)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip formatter={(value) => formatNumber(value) + " j/h"} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey={activeWP}
                  fill="#8884d8"
                  stroke="#8884d8"
                  name={activeWP}
                />
                {wpHierarchy[activeWP] &&
                  wpHierarchy[activeWP].subWPs.map((subWP, index) => (
                    <Line
                      key={subWP}
                      type="monotone"
                      dataKey={subWP}
                      stroke={COLORS[index % COLORS.length]}
                      name={subWP}
                    />
                  ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "roles" && (
        <div>
          <div className="charts-row">
            {/* Charge totale par rôle */}
            <div className="chart-container">
              <h2>Charge totale par rôle</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={orderBy(roleData, "total", ["desc"])}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatNumber(value)}
                  />
                  <YAxis type="category" dataKey="role" width={150} />
                  <Tooltip
                    formatter={(value) => formatNumber(value) + " j/h"}
                  />
                  <Legend />
                  <Bar
                    dataKey="setup"
                    name="Setup"
                    stackId="a"
                    fill={COLORS_SETUP}
                  />
                  <Bar
                    dataKey="monitor"
                    name="Monitor"
                    stackId="a"
                    fill={COLORS_MONITOR}
                  />
                  <Bar dataKey="run" name="Run" stackId="a" fill={COLORS_RUN} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Répartition des activités par rôle (%) */}
            <div className="chart-container">
              <h2>Répartition des activités par rôle (%)</h2>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={roleData.map((role) => ({
                    role: role.role,
                    setup: parseFloat(
                      ((role.setup / role.total) * 100).toFixed(1)
                    ),
                    monitor: parseFloat(
                      ((role.monitor / role.total) * 100).toFixed(1)
                    ),
                    run: parseFloat(((role.run / role.total) * 100).toFixed(1)),
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="role" width={150} />
                  <Tooltip formatter={(value) => value + "%"} />
                  <Legend />
                  <Bar
                    dataKey="setup"
                    name="Setup %"
                    stackId="a"
                    fill={COLORS_SETUP}
                  />
                  <Bar
                    dataKey="monitor"
                    name="Monitor %"
                    stackId="a"
                    fill={COLORS_MONITOR}
                  />
                  <Bar
                    dataKey="run"
                    name="Run %"
                    stackId="a"
                    fill={COLORS_RUN}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top 3 des rôles by charge */}
          <div className="chart-container">
            <h2>Top 3 rôles par rapport à la charge totale</h2>
            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px"}}>
              {orderBy(roleData, "total", ["desc"])
                .slice(0, 3)
                .map((role, index) => (
                  <div key={index} style={{backgroundColor: "#f5f5f5", padding: "16px", borderRadius: "8px"}}>
                    <h4 style={{fontWeight: "600", fontSize: "18px", marginBottom: "8px"}}>{role.role}</h4>
                    <p style={{fontSize: "22px", fontWeight: "bold"}}>
                      {formatNumber(role.total)} j/h
                    </p>
                    <p style={{fontSize: "14px", color: "#666"}}>
                      {((role.total / totals.grandTotal) * 100).toFixed(1)}% de
                      la charge totale
                    </p>
                    <div style={{marginTop: "10px"}}>
                      <div style={{display: "flex", justifyContent: "space-between", fontSize: "14px"}}>
                        <span>Setup:</span>
                        <span>
                          {formatNumber(role.setup)} j/h (
                          {((role.setup / role.total) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{display: "flex", justifyContent: "space-between", fontSize: "14px"}}>
                        <span>Monitor:</span>
                        <span>
                          {formatNumber(role.monitor)} j/h (
                          {((role.monitor / role.total) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{display: "flex", justifyContent: "space-between", fontSize: "14px"}}>
                        <span>Run:</span>
                        <span>
                          {formatNumber(role.run)} j/h (
                          {((role.run / role.total) * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div>
          {/* Évolution mensuelle globale avec années et FTE */}
          <div className="chart-container">
            <h2>Évolution mensuelle de la charge globale</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={monthlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  padding={{ left: 5, right: 5 }}
                />
                <YAxis 
                  yAxisId="left" 
                  tickFormatter={(value) => formatNumber(value)} 
                  label={{ value: 'Charge (j/h)', angle: -90, position: 'insideLeft' }} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'FTE Moyen (%)', angle: 90, position: 'insideRight' }} 
                />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "Charge totale") return formatNumber(value) + " j/h";
                    if (name === "FTE Moyen") return value + "%";
                    return value;
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  name="Charge totale"
                  fill="#8884d8"
                  stroke="#8884d8"
                  fillOpacity={0.6}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ftePercentage"
                  name="FTE Moyen"
                  stroke={COLORS_FTE}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Évolution hebdomadaire avec FTE */}
          <div className="chart-container">
            <h2>Évolution hebdomadaire de la charge</h2>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={weeklyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis 
                  yAxisId="left" 
                  tickFormatter={(value) => formatNumber(value)} 
                  label={{ value: 'Charge (j/h)', angle: -90, position: 'insideLeft' }} 
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  domain={[0, 100]} 
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: 'FTE (%)', angle: 90, position: 'insideRight' }} 
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === "Charge hebdomadaire") return formatNumber(value) + " j/h";
                    if (name === "FTE") return value + "%";
                    return value;
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="total"
                  name="Charge hebdomadaire"
                  fill="#8884d8"
                  stroke="#8884d8"
                  fillOpacity={0.6}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="ftePercentage"
                  name="FTE"
                  stroke={COLORS_FTE}
                  dot={false}
                  strokeWidth={2}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Comparaison des WPs principaux dans le temps */}
          <div className="chart-container">
            <h2>Comparaison des Work Packages principaux dans le temps</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  type="category"
                  allowDuplicatedCategory={false}
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip formatter={(value) => formatNumber(value) + " j/h"} />
                <Legend />
                {mainWPs.map((wp, index) => {
                  const wpData = wpMonthlyData.find(
                    (item) => item.workPackage === wp
                  );
                  if (!wpData) return null;

                  const data = Object.entries(wpData)
                    .filter(([key]) => key !== "workPackage")
                    .map(([month, value]) => ({ month, [wp]: value }));

                  return (
                    <Line
                      key={wp}
                      data={data}
                      type="monotone"
                      dataKey={wp}
                      stroke={COLORS[index % COLORS.length]}
                      name={wp}
                      activeDot={{ r: 8 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChargeDisplay;
