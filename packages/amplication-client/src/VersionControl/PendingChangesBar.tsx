import React from "react";
import "./PendingChangesBar.scss";
import PendingChanges from "./PendingChanges";

const CLASS_NAME = "pending-changes-bar";

type Props = {
  applicationId: string;
};

const PendingChangesBar = ({ applicationId }: Props) => {
  return (
    <div className={CLASS_NAME}>
      <h2>Pending Changes</h2>
      <PendingChanges applicationId={applicationId} />
    </div>
  );
};

export default PendingChangesBar;
