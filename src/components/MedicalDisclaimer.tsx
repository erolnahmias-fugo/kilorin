/** Legal footer — required on onboarding and profile. */
export function MedicalDisclaimer({ className = '' }: { className?: string }) {
  return (
    <p
      className={`text-center text-t35 ${className}`}
      style={{ fontSize: 10.5, fontWeight: 500, lineHeight: 1.5 }}
    >
      Bu uygulama tıbbi/medikal tavsiye vermez. Sağlıkla ilgili kararlar için bir uzmana danış.
    </p>
  );
}
