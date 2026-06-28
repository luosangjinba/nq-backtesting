import * as bus from '../../event-bus.js';
import { exportPdaArchive, importPdaArchive } from '../../pda/pda-archive.js';
import { clearSavedAnnotations, migrateCurrentPdaAnnotationsToServer } from '../../pda/pda-persistence.js';
import { exportReviewArchive, importReviewArchive } from '../../review/review-archive.js';

export function createInspectorArchiveActionController({
  clickInspectorBodyAction,
  confirmSync = () => true,
}) {
  function handleChange(action, target) {
    if (action === 'import-pda-file') {
      importPdaArchive(target.files?.[0]);
      target.value = '';
      return true;
    }

    if (action === 'import-review-file') {
      importReviewArchive(target.files?.[0]);
      target.value = '';
      return true;
    }

    return false;
  }

  function handleClick(action) {
    if (action === 'export-pda') {
      exportPdaArchive();
      return true;
    }

    if (action === 'export-review') {
      exportReviewArchive();
      return true;
    }

    if (action === 'import-pda') {
      clickInspectorBodyAction('import-pda-file');
      return true;
    }

    if (action === 'sync-pda-server') {
      const confirmed = confirmSync();
      if (!confirmed) return true;
      migrateCurrentPdaAnnotationsToServer().then((result) => {
        bus.emit('status:update', {
          text: result?.ok ? 'PDA 标注已同步到服务器' : 'PDA 服务器同步未完成，请检查连接',
          isError: !result?.ok,
        });
      });
      return true;
    }

    if (action === 'import-review') {
      clickInspectorBodyAction('import-review-file');
      return true;
    }

    if (action === 'clear-saved') {
      clearSavedAnnotations();
      return true;
    }

    return false;
  }

  return {
    handleChange,
    handleClick,
  };
}
