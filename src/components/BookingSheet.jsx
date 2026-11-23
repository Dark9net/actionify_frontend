import useDialog, { dialogProps } from '../hooks/useDialog.js';
import BookingForm from './BookingForm.jsx';
import { Cross } from './Icons.jsx';
import { hire } from '../data/content.js';
import '../styles/overlays.css';

/* The booking form in a sheet from the right. It keeps what was typed if it is closed and reopened. */
export default function BookingSheet({ open, onClose }) {
  const ref = useDialog(open);
  return (
    <dialog
      ref={ref}
      className="sheet sheet--right book-sheet"
      aria-labelledby="book-sheet-title"
      {...dialogProps(open, onClose)}
    >
      <div className="sheet-in">
        <div className="sheet-head">
          <span className="label">{hire.formLabel}</span>
          <button className="sheet-close label" type="button" onClick={onClose}>
            <span>Close</span>
            <Cross />
          </button>
        </div>
        <div className="sheet-body">
          <h2 className="sheet-title display" id="book-sheet-title">
            {hire.formTitle}
          </h2>
          <p className="sheet-note">{hire.formNote}</p>
          <BookingForm />
        </div>
      </div>
    </dialog>
  );
}
