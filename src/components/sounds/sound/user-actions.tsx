import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { HiDotsHorizontal } from 'react-icons/hi';
import { IoPencil, IoTrashOutline } from 'react-icons/io5';

import { Modal } from '@/components/modal';
import { useSnackbar } from '@/contexts/snackbar';
import { useSoundLibraryStore } from '@/stores/sound-library';

import styles from './user-actions.module.css';

interface UserSoundActionsProps {
  id: string;
  label: string;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function UserSoundActions({ id, label }: UserSoundActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [nextLabel, setNextLabel] = useState(label);

  const pending = useSoundLibraryStore(state => state.pendingIds.includes(id));
  const removeSound = useSoundLibraryStore(state => state.removeSound);
  const renameSound = useSoundLibraryStore(state => state.renameSound);
  const showSnackbar = useSnackbar();

  const openRename = () => {
    setNextLabel(label);
    setRenameOpen(true);
  };

  const handleRename = async () => {
    try {
      const sound = await renameSound(id, nextLabel);
      setRenameOpen(false);
      showSnackbar(`Renamed to ${sound.label}.`);
    } catch (error) {
      showSnackbar(errorMessage(error, 'Could not rename the sound.'));
    }
  };

  const handleDelete = async () => {
    try {
      await removeSound(id);
      setDeleteOpen(false);
      showSnackbar(`${label} removed from My Sounds.`);
    } catch (error) {
      showSnackbar(errorMessage(error, 'Could not remove the sound.'));
    }
  };

  const stopPropagation = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger asChild>
          <button
            aria-label={`Manage ${label}`}
            className={styles.trigger}
            disabled={pending}
            type="button"
            onClick={stopPropagation}
            onKeyDown={stopPropagation}
          >
            <HiDotsHorizontal />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            className={styles.menu}
            sideOffset={6}
            onClick={stopPropagation}
            onKeyDown={stopPropagation}
          >
            <DropdownMenu.Item className={styles.item} onSelect={openRename}>
              <IoPencil />
              Rename
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className={styles.item}
              onSelect={() => setDeleteOpen(true)}
            >
              <IoTrashOutline />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Modal show={renameOpen} onClose={() => setRenameOpen(false)}>
        <form
          onClick={stopPropagation}
          onKeyDown={stopPropagation}
          onSubmit={event => {
            event.preventDefault();
            void handleRename();
          }}
        >
          <h1 className={styles.title}>Rename Sound</h1>
          <p className={styles.description}>
            Choose the name shown in your Miauudio library.
          </p>
          <label className={styles.label} htmlFor={`rename-${id}`}>
            Sound name
          </label>
          <input
            className={styles.input}
            disabled={pending}
            id={`rename-${id}`}
            maxLength={80}
            value={nextLabel}
            onChange={event => setNextLabel(event.target.value)}
          />
          <div className={styles.footer}>
            <button
              className={styles.button}
              disabled={pending}
              type="button"
              onClick={() => setRenameOpen(false)}
            >
              Cancel
            </button>
            <button
              className={`${styles.button} ${styles.primary}`}
              disabled={pending || !nextLabel.trim()}
              type="submit"
            >
              {pending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal show={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <form
          onClick={stopPropagation}
          onKeyDown={stopPropagation}
          onSubmit={event => {
            event.preventDefault();
            void handleDelete();
          }}
        >
          <h1 className={styles.title}>Delete Sound?</h1>
          <p className={styles.description}>
            {label} will be removed from this device. Presets that use it will
            skip the unavailable layer.
          </p>
          <div className={styles.footer}>
            <button
              className={styles.button}
              disabled={pending}
              type="button"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
            <button
              className={`${styles.button} ${styles.danger}`}
              disabled={pending}
              type="submit"
            >
              {pending ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
