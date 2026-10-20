import Icon from "@/components/recruiter/Icon";
import type { Journey } from "@/lib/journey";
import { journeySteps } from "./hybrid";

export default function JourneyRail({ journey, step, onStep }: { journey: Journey; step: number; onStep: (step: number) => void }) {
  return <nav className="city-journey" id="fil-quickjob" aria-label={`Étapes du parcours ${journey}`}>
    <div className="city-journey-label"><span className="city-thread-mark" aria-hidden="true" /> Le fil QuickJob <span>Choisissez votre prochaine étape.</span></div>
    <ol>{journeySteps[journey].map((item, index) => <li key={item.label}>
      <button type="button" aria-current={index === step ? "step" : undefined} onClick={() => onStep(index)}>
        <span className="city-step-number">{`0${index + 1}`}</span>
        <span className="city-step-copy"><strong>{item.label}</strong><small>{item.short}</small></span>
        <Icon name="arrow" size={16} />
      </button>
    </li>)}</ol>
  </nav>;
}
