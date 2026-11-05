import { ref } from 'vue';

export function useAccessCodeLoader() {
  const isLoading = ref(false);
  const error = ref('');

  const load = async (request) => {
    isLoading.value = true;
    error.value = '';

    let result = null;

    try {
      result = await request();
    } catch (caught) {
      const sessionExpired =
        caught instanceof Error &&
        caught.message === 'Sessie verlopen, log opnieuw in.';

      error.value = sessionExpired
        ? 'Je sessie is verlopen. Log opnieuw in.'
        : 'Toegangscodes konden niet worden geladen. Probeer het opnieuw.';
    }

    isLoading.value = false;
    return result;
  };

  return { isLoading, error, load };
}
