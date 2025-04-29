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
import _ from "lodash";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#82ca9d",
  "#ffc658",
  "#8dd1e1",
  "#a4de6c",
  "#d0ed57",
  "#83a6ed",
];
const COLORS_SETUP = "#0088FE";
const COLORS_MONITOR = "#00C49F";
const COLORS_RUN = "#FFBB28";
const COLORS_MONTHS = [
  "#8884d8",
  "#83a6ed",
  "#8dd1e1",
  "#82ca9d",
  "#a4de6c",
  "#d0ed57",
  "#ffc658",
  "#FF8042",
  "#ff7f50",
  "#da70d6",
  "#9370db",
  "#8a2be2",
];

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

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const response = await window.fs.readFile("AL_Charge.xlsx");
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

        // Mois disponibles
        const months = [
          { month: "Jun", column: 42 },
          { month: "Jul", column: 47 },
          { month: "Aug", column: 52 },
          { month: "Sep", column: 57 },
          { month: "Oct", column: 62 },
          { month: "Nov", column: 67 },
          { month: "Dec", column: 72 },
          { month: "Jan", column: 77 },
          { month: "Feb", column: 82 },
          { month: "Mar", column: 87 },
          { month: "Apr", column: 92 },
          { month: "May", column: 97 },
        ];

        // 1. Calculer la charge totale par WP (uniquement les sous-WPs, pas les WPs de synthèse)
        let wpData = [];

        // D'abord calculer les sous-WPs
        for (let wp of allWorkPackages) {
          let setup = 0;
          let monitor = 0;
          let run = 0;

          for (let i = 3; i < data.length; i++) {
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

          for (let i = 3; i < data.length; i++) {
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

          // Pour chaque mois, utiliser les 4 semaines correspondantes
          for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
            const weekIndex = monthObj.column + weekOffset;

            for (let i = 3; i < data.length; i++) {
              // Ne prendre en compte que les lignes qui ne sont pas des WPs de synthèse
              if (
                data[i] &&
                !summaryWPs.includes(data[i][0]) &&
                data[i][weekIndex] !== null &&
                data[i][weekIndex] !== undefined
              ) {
                total += data[i][weekIndex];
              }
            }
          }

          monthlyDataCalc.push({
            month: monthObj.month,
            total: parseFloat(total.toFixed(2)),
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

              for (let i = 3; i < data.length; i++) {
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

          for (let i = 3; i < data.length; i++) {
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
          });
        }
        setWeeklyData(weeklyDataCalc);

        // 7. Totaux généraux - sans inclure les lignes de synthèse
        let totalSetup = 0;
        let totalMonitor = 0;
        let totalRun = 0;

        for (let i = 3; i < data.length; i++) {
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
        console.error("Erreur lors du chargement des données:", error);
        setIsLoading(false);
      }
    };

    loadData();
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

    const months = [
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
    ];
    return months.map((month) => ({
      month,
      charge: mainWpData[month] || 0,
    }));
  };

  // Fonction pour obtenir les données temporelles d'un WP principal et ses sous-WPs
  const getWpDetailedMonthlyData = (mainWP) => {
    if (!wpHierarchy[mainWP]) return [];

    const allWps = [mainWP, ...wpHierarchy[mainWP].subWPs];
    const months = [
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
    ];

    return months.map((month) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl font-semibold">Chargement des données...</div>
      </div>
    );
  }

  return (
    <div className="p-6 font-sans">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Dashboard de charge de travail
      </h1>

      {/* Statistiques globales */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-blue-800">Charge totale</h3>
          <p className="text-3xl font-bold">
            {formatNumber(totals.grandTotal)} j/h
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-green-800">Setup</h3>
          <p className="text-3xl font-bold">
            {formatNumber(totals.totalSetup)} j/h
          </p>
          <p className="text-sm text-green-600">
            ({((totals.totalSetup / totals.grandTotal) * 100).toFixed(1)}%)
          </p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-yellow-800">Monitor</h3>
          <p className="text-3xl font-bold">
            {formatNumber(totals.totalMonitor)} j/h
          </p>
          <p className="text-sm text-yellow-600">
            ({((totals.totalMonitor / totals.grandTotal) * 100).toFixed(1)}%)
          </p>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-orange-800">Run</h3>
          <p className="text-3xl font-bold">
            {formatNumber(totals.totalRun)} j/h
          </p>
          <p className="text-sm text-orange-600">
            ({((totals.totalRun / totals.grandTotal) * 100).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 ${
            activeTab === "overview"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Vue d'ensemble
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === "wp"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("wp")}
        >
          Work Packages
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === "roles"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("roles")}
        >
          Rôles
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === "timeline"
              ? "border-b-2 border-blue-500 font-medium"
              : "text-gray-500"
          }`}
          onClick={() => setActiveTab("timeline")}
        >
          Évolution temporelle
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === "overview" && (
        <div>
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Répartition globale par type d'activité */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                Répartition par type d'activité
              </h3>
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
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                Top Work Packages principaux par charge
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={_.orderBy(
                    workPackageData.filter((wp) =>
                      mainWPs.includes(wp.workPackage)
                    ),
                    ["total"],
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

          <div className="grid grid-cols-2 gap-6">
            {/* Distribution mensuelle de la charge */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                Distribution mensuelle de la charge
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={monthlyData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => formatNumber(value)} />
                  <Tooltip
                    formatter={(value) => formatNumber(value) + " j/h"}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Charge totale"
                    fill="#8884d8"
                    stroke="#8884d8"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top 5 des rôles par charge totale */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">Top Rôles par charge</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={_.orderBy(roleData, ["total"], ["desc"]).slice(0, 5)}
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

          {/* Courbe de charge hebdomadaire */}
          <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h3 className="text-lg font-medium mb-4">
              Évolution de la charge hebdomadaire
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={weeklyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip formatter={(value) => formatNumber(value) + " j/h"} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Charge hebdomadaire"
                  stroke="#8884d8"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "wp" && (
        <div>
          {/* Sélection du Work Package */}
          <div className="flex mb-6 space-x-2 overflow-x-auto pb-2">
            {mainWPs.map((wp) => (
              <button
                key={wp}
                className={`px-3 py-1 rounded ${
                  activeWP === wp ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
                onClick={() => setActiveWP(wp)}
              >
                {wp}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Détails du Work Package sélectionné */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                {activeWP} - Répartition par type
              </h3>
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
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                {activeWP} - Évolution mensuelle
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={getWpMonthlyChartData(activeWP)}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
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
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium mb-4">
              {activeWP} - Sous-Work Packages
            </h3>
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
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">
              {activeWP} - Évolution détaillée par sous-WP
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart
                data={getWpDetailedMonthlyData(activeWP)}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
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
          <div className="grid grid-cols-2 gap-6 mb-6">
            {/* Charge totale par rôle */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                Charge totale par rôle
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={_.orderBy(roleData, ["total"], ["desc"])}
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
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-medium mb-4">
                Répartition des activités par rôle (%)
              </h3>
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

          {/* Top 3 des Work Packages par rôle */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium mb-4">
              Top 3 rôles par rapport à la charge totale
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {_.orderBy(roleData, ["total"], ["desc"])
                .slice(0, 3)
                .map((role, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-lg mb-2">{role.role}</h4>
                    <p className="text-2xl font-bold">
                      {formatNumber(role.total)} j/h
                    </p>
                    <p className="text-sm text-gray-600">
                      {((role.total / totals.grandTotal) * 100).toFixed(1)}% de
                      la charge totale
                    </p>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm">
                        <span>Setup:</span>
                        <span>
                          {formatNumber(role.setup)} j/h (
                          {((role.setup / role.total) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Monitor:</span>
                        <span>
                          {formatNumber(role.monitor)} j/h (
                          {((role.monitor / role.total) * 100).toFixed(1)}%)
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
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
          {/* Évolution mensuelle globale */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium mb-4">
              Évolution mensuelle de la charge globale
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={monthlyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip formatter={(value) => formatNumber(value) + " j/h"} />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Charge totale"
                  fill="#8884d8"
                  stroke="#8884d8"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Évolution hebdomadaire */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium mb-4">
              Évolution hebdomadaire de la charge
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={weeklyData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip formatter={(value) => formatNumber(value) + " j/h"} />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Charge"
                  stroke="#8884d8"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Comparaison des WPs principaux dans le temps */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium mb-4">
              Comparaison des Work Packages principaux dans le temps
            </h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  type="category"
                  allowDuplicatedCategory={false}
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
