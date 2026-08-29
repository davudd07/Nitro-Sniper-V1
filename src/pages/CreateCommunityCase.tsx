import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CreateCommunityCaseForm } from "../components/cases/CreateCommunityCaseForm";
import { sound } from "../lib/sound";

const COMMUNITY_CASES = "/cases?catalog=community";

export function CreateCommunityCasePage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <Link
        to={COMMUNITY_CASES}
        onClick={() => sound.click()}
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Community cases
      </Link>
      <CreateCommunityCaseForm
        onCreated={(id) => {
          navigate(`/cases/${id}`);
        }}
      />
    </div>
  );
}
