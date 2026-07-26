// Temporary stand-in for a screen nobody has built yet.
// When you build your screen, delete the <Placeholder /> and put real content in.
export default function Placeholder({ title, note, owner }) {
  return (
    <div className="placeholder">
      <strong>{title}</strong>
      {note}
      {owner && <span className="owner">owner: {owner}</span>}
    </div>
  )
}
