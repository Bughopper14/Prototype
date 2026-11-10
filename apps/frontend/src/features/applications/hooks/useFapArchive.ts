/** The viewer of the archived FAP submissions of an application. */
import {useState} from 'react';
import {api} from '@/shared/lib/api';

export function useFapArchive({a, notify}: {a: any; notify: (s: string) => void}) {
  const [archiveModalOpen, setArchiveModalOpen] = useState<boolean>(false);
  const [archivesList, setArchivesList] = useState<any[]>([]);
  const [loadingArchives, setLoadingArchives] = useState<boolean>(false);
  const [selectedArchiveIdx, setSelectedArchiveIdx] = useState<number>(0);

  const openArchiveViewer = async () => {
    setLoadingArchives(true);
    setArchiveModalOpen(true);
    try {
      const res = await api(`/applications/${a.id}/fap-archive`);
      if (res?.archives) {
        setArchivesList(res.archives);
        setSelectedArchiveIdx(0);
      }
    } catch (err: any) {
      notify('Failed to load FAP submission archive: ' + err.message);
    } finally {
      setLoadingArchives(false);
    }
  };

  return {
    archiveModalOpen,
    setArchiveModalOpen,
    archivesList,
    setArchivesList,
    loadingArchives,
    setLoadingArchives,
    selectedArchiveIdx,
    setSelectedArchiveIdx,
    openArchiveViewer,
  };
}
