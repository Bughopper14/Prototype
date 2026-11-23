/** A searchable, paged list of applications (opened from "view all" in a version history). */
import {Search} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Link} from 'react-router';
import {applicationHref} from '@/shared/lib/routes';
import {Modal} from './Modal';

export interface ApplicationsPage {
  total: number;
  page: number;
  size: number;
  items: {id: string; companyName: string | null; createdAt: string}[];
}

export function ApplicationsDialog({
  title,
  load,
  onClose,
}: {
  title: string;
  load: (search: string, page: number) => Promise<ApplicationsPage>;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApplicationsPage | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setError('');
        load(search.trim(), page)
          .then(setData)
          .catch(e => setError(e?.message || 'Could not load the applications'));
      },
      search ? 250 : 0,
    );
    return () => clearTimeout(timer);
  }, [load, search, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  return (
    <Modal title={title} onClose={onClose} className="adlg">
      <div className="adlg-body">
        <label className="adlg-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            placeholder="Search company name"
            onChange={e => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {error && <p className="adlg-note">{error}</p>}
        {!data && !error && <div className="loading-strip" />}
        {data && (
          <>
            <p className="adlg-count">
              {data.total} application{data.total === 1 ? '' : 's'}
              {search.trim() ? ' match your search' : ''}
            </p>
            {data.items.length === 0 ? (
              <p className="adlg-note">No application found.</p>
            ) : (
              <ul className="adlg-list">
                {data.items.map(a => (
                  <li key={a.id}>
                    <Link to={applicationHref(a.id)} onClick={onClose}>
                      {a.companyName || 'Application'}
                    </Link>
                    <time>{new Date(a.createdAt).toLocaleDateString('en-GB', {dateStyle: 'medium'})}</time>
                  </li>
                ))}
              </ul>
            )}
            {pages > 1 && (
              <div className="adlg-pager">
                <button
                  type="button"
                  className="wf-btn small"
                  disabled={data.page <= 1}
                  onClick={() => setPage(data.page - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {data.page} of {pages}
                </span>
                <button
                  type="button"
                  className="wf-btn small"
                  disabled={data.page >= pages}
                  onClick={() => setPage(data.page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
