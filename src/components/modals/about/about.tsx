import { Browser } from '@capacitor/browser';
import { useEffect, useState } from 'react';

import { Modal } from '@/components/modal';
import { APP_VERSION, IS_NATIVE_APP, SUPPORT_EMAIL } from '@/constants/app';

import styles from './about.module.css';

interface AboutModalProps {
  onClose: () => void;
  show: boolean;
}

const PRIVACY_POLICY_URL =
  'https://github.com/MichalMatu/miauudio/blob/main/docs/PRIVACY_POLICY.md';

function openExternal(event: React.MouseEvent<HTMLAnchorElement>) {
  if (!IS_NATIVE_APP) return;

  event.preventDefault();
  void Browser.open({ url: event.currentTarget.href });
}

export function AboutModal({ onClose, show }: AboutModalProps) {
  const [displayVersion, setDisplayVersion] = useState(APP_VERSION);
  const [thirdPartyNotices, setThirdPartyNotices] = useState<string>();
  const [noticesLoadFailed, setNoticesLoadFailed] = useState(false);

  useEffect(() => {
    if (!show || !IS_NATIVE_APP) return;

    let cancelled = false;
    void import('@capacitor/app')
      .then(({ App }) => App.getInfo())
      .then(info => {
        if (!cancelled) setDisplayVersion(`${info.version} (${info.build})`);
      })
      .catch(() => {
        if (!cancelled) setDisplayVersion(APP_VERSION);
      });

    return () => {
      cancelled = true;
    };
  }, [show]);

  const loadNotices = async (
    event: React.SyntheticEvent<HTMLDetailsElement>,
  ) => {
    if (!event.currentTarget.open || thirdPartyNotices !== undefined) return;

    setNoticesLoadFailed(false);
    try {
      const response = await fetch('/third-party-notices.txt');
      if (!response.ok) throw new Error('Notices could not be loaded');
      setThirdPartyNotices(await response.text());
    } catch {
      setNoticesLoadFailed(true);
    }
  };

  return (
    <Modal show={show} onClose={onClose}>
      <header className={styles.header}>
        <h2 className={styles.title}>About Miauudio</h2>
        <p className={styles.lead}>
          A free ambient sound mixer for focus and relaxation.
        </p>
        <p>
          Miauudio is not a medical device and does not diagnose, treat, cure,
          or prevent any medical condition. Consult a qualified healthcare
          professional for medical advice, diagnosis, or treatment.
        </p>
        <p>Version {displayVersion}</p>
      </header>

      <section className={styles.section}>
        <h3>Privacy</h3>
        <p>
          The Android app has no accounts, advertising, or analytics. Your
          mixes, presets, notes, todos, settings, and imported audio stay on
          your device and are not sent to the developer. The app does not
          request internet access.
        </p>
        <p>
          Delete an imported sound from My Sounds, or clear the app data or
          uninstall Miauudio to remove all locally stored data.
        </p>
        <p>
          Android cloud backup and device-to-device transfer are disabled for
          Miauudio app data.
        </p>
        <a
          href={IS_NATIVE_APP ? PRIVACY_POLICY_URL : '/privacy'}
          rel="noreferrer"
          target="_blank"
          onClick={openExternal}
        >
          Read the complete privacy policy
        </a>
      </section>

      <section className={styles.section}>
        <h3>Open-source notices</h3>
        <p>
          Miauudio is derived from Moodist and uses open-source JavaScript and
          Android libraries. Their copyright notices and licenses remain with
          their respective authors.
        </p>
        <details className={styles.noticesDisclosure} onToggle={loadNotices}>
          <summary>View licenses and third-party notices</summary>
          <pre className={styles.notices}>
            {thirdPartyNotices ??
              (noticesLoadFailed
                ? 'Open-source notices could not be loaded. Collapse and expand this section to retry.'
                : 'Loading notices…')}
          </pre>
        </details>
      </section>

      <section className={styles.section}>
        <h3>Support</h3>
        <p>
          For support or feedback, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </Modal>
  );
}
