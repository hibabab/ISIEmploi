import { useState } from "react";
import Formations from "./Formations";
import Parcours from "./Parcours";
import ParcoursModules from "./ParcoursModules"; // Nouveau composant

export default function PlanEtude() {
  const [screen, setScreen] = useState("formations");
  const [selFormation, setSelFormation] = useState(null);
  const [selParcours, setSelParcours] = useState(null);

  const goFormations = () => {
    setSelFormation(null);
    setSelParcours(null);
    setScreen("formations");
  };

  const goParcours = (formation) => {
    setSelFormation(formation);
    setSelParcours(null);
    setScreen("parcours");
  };

  const goModules = (parcours, formation) => {
    setSelParcours(parcours);
    setSelFormation(formation);
    setScreen("modules");
  };

  if (screen === "formations") return (
    <Formations onSelectFormation={goParcours} />
  );

  if (screen === "parcours") return (
    <Parcours
      formation={selFormation}
      onBack={goFormations}
      onConsulter={goModules}
    />
  );

  if (screen === "modules") return (
    <ParcoursModules
      formation={selFormation}
      parcours={selParcours}
      onBackFormation={goFormations}
      onBackParcours={() => goParcours(selFormation)}
    />
  );

  return null;
}