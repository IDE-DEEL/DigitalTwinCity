import { ref } from 'vue';

export function useAccessCodeLoader() {
  const isLoading = ref(false);
  const error = ref('');

  const load = async (request) => {
    isLoading.value = true;
    error.value = '';
    try {
      return await request();
    } catch (caught) {
      error.value = caught?.message === 'Sessie verlopen, log opnieuw in.'
        ? 'Je sessie is verlopen. Log opnieuw in.'
        : 'Toegangscodes konden niet worden geladen. Probeer het opnieuw.';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  return { isLoading, error, load };
}
