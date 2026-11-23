import { useRef, useState } from 'react';

/* Field values, per-field errors, and focus on the first invalid field when a submit fails. */
export default function useForm(initial, validate) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  function set(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((er) => (er[name] ? { ...er, [name]: undefined } : er));
  }

  function check() {
    const found = validate(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) formRef.current?.elements[first]?.focus();
    return !first;
  }

  // errors from the server (one per field), with focus on the first, like a failed check
  function showErrors(found) {
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) formRef.current?.elements[first]?.focus();
  }

  return { values, errors, set, check, showErrors, formRef };
}
