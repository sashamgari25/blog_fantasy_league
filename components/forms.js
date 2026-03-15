export function InputField({ label, name, defaultValue = "", placeholder = "", type = "text" }) {
  return (
    <label className="fieldBlock">
      <span>{label}</span>
      <input className="field" name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} required />
    </label>
  );
}

export function TextareaField({ label, name, defaultValue = "", placeholder = "" }) {
  return (
    <label className="fieldBlock fieldBlockWide">
      <span>{label}</span>
      <textarea className="textarea" name={name} defaultValue={defaultValue} placeholder={placeholder} required />
    </label>
  );
}
