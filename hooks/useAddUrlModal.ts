import { useState } from 'react';
import { parseHttpUrl } from '../lib/parseHttpUrl';

const INVALID_URL_MESSAGE = 'Enter a valid http(s) URL';
const ADD_FAILED_MESSAGE = 'Could not load this URL. Check the link and your connection.';

export function useAddUrlModal(onAddUrl: (url: string) => Promise<void>) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [input, setInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const open = () => setIsVisible(true);

  const close = () => {
    setIsVisible(false);
    setInput('');
    setErrorMessage(null);
  };

  const changeInput = (value: string) => {
    setInput(value);
    setErrorMessage(null);
  };

  const submit = async () => {
    if (isSubmitting) return;

    const url = parseHttpUrl(input);
    if (!url) {
      setErrorMessage(INVALID_URL_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddUrl(url);
      close();
    } catch {
      setErrorMessage(ADD_FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isVisible, isSubmitting, input, errorMessage, open, close, changeInput, submit };
}
