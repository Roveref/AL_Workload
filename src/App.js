import React, { Component } from "react";
import ChargeDisplay from "./ChargeDisplay";

// ErrorBoundary Component to catch any runtime errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Une erreur est survenue
          </h2>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-4">
            <p className="mb-2 font-medium">Message d'erreur:</p>
            <pre className="bg-white p-3 rounded text-red-800 text-sm overflow-auto">
              {this.state.error && this.state.error.toString()}
            </pre>
          </div>
          <p className="mb-4">Veuillez vérifier que:</p>
          <ul className="list-disc pl-5 mb-4 space-y-2">
            <li>Le fichier Excel est au format correct</li>
            <li>Vous utilisez un navigateur moderne et à jour</li>
            <li>Vous avez une connexion internet stable</li>
          </ul>
          <button
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded"
            onClick={() => window.location.reload()}
          >
            Rafraîchir la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <ChargeDisplay />
      </ErrorBoundary>
    </div>
  );
}
