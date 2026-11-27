import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Props {
  /** Prefix for the checkbox ids, so the fields can appear on more than one page. */
  idPrefix: string;
  privacyAccepted: boolean;
  onPrivacyAccepted: (value: boolean) => void;
  emailOptIn: boolean;
  onEmailOptIn: (value: boolean) => void;
}

/**
 * The two consent checkboxes shown wherever an account is created: the required privacy consent
 * (GDPR) and the optional email opt-in for people testing SYNC. Both start unticked, because
 * consent has to be an active choice.
 */
const ConsentFields = ({ idPrefix, privacyAccepted, onPrivacyAccepted, emailOptIn, onEmailOptIn }: Props) => (
  <div className="space-y-4">
    <div className="flex items-start gap-3">
      <Checkbox
        id={`${idPrefix}-privacy`}
        checked={privacyAccepted}
        onCheckedChange={value => onPrivacyAccepted(value === true)}
        aria-required="true"
        className="mt-0.5 h-5 w-5 shrink-0"
      />
      <Label htmlFor={`${idPrefix}-privacy`} className="text-sm font-normal leading-5 text-muted-foreground">
        I agree to SYNC's privacy policy and to my personal data being processed under the GDPR to create my
        account and recommend events. *
      </Label>
    </div>
    <div className="flex items-start gap-3">
      <Checkbox
        id={`${idPrefix}-email-opt-in`}
        checked={emailOptIn}
        onCheckedChange={value => onEmailOptIn(value === true)}
        className="mt-0.5 h-5 w-5 shrink-0"
      />
      <Label htmlFor={`${idPrefix}-email-opt-in`} className="text-sm font-normal leading-5 text-muted-foreground">
        Email me about testing SYNC: new features and the occasional short feedback request. You can unsubscribe
        at any time.
      </Label>
    </div>
  </div>
);

export default ConsentFields;
