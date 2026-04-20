'use client';

import React, { useState, useCallback } from 'react';
import { Flex, Text, Avatar, Box, Switch, Button, AlertDialog } from '@radix-ui/themes';
import { MaterialIcon } from '@/app/components/ui/MaterialIcon';
import { getSyncStrategyLabel, getSyncIntervalLabel } from '../instance-card/utils';
import type { ConnectorInstance, ConnectorConfig } from '../../types';

// ========================================
// Props
// ========================================

interface SettingsTabProps {
  instance: ConnectorInstance;
  /** Config data from GET /connectors/{id}/config */
  config?: ConnectorConfig | null;
  /** Called to toggle the instance active/inactive */
  onToggleInstance?: (instance: ConnectorInstance) => Promise<void>;
  /** Called to delete the instance */
  onDeleteInstance?: (instance: ConnectorInstance) => Promise<void>;
}

// ========================================
// SettingsTab
// ========================================

export function SettingsTab({ instance, config, onToggleInstance, onDeleteInstance }: SettingsTabProps) {
  const syncStrategy = getSyncStrategyLabel(config ?? undefined) ?? 'Manual';
  const syncInterval = getSyncIntervalLabel(config ?? undefined);
  const isScheduled = syncStrategy.toLowerCase() === 'scheduled';
  const importStartDate = config?.config?.sync?.scheduledConfig?.startDateTime;

  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isActive = instance.isActive;
  const isBeingDeleted = instance.status === 'DELETING';

  const handleToggle = useCallback(async () => {
    if (!onToggleInstance || isToggling) return;
    setIsToggling(true);
    try {
      await onToggleInstance(instance);
    } finally {
      setIsToggling(false);
    }
  }, [instance, onToggleInstance, isToggling]);

  const handleDelete = useCallback(async () => {
    if (!onDeleteInstance || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteInstance(instance);
      setDeleteDialogOpen(false);
    } catch {
      setIsDeleting(false);
    }
  }, [instance, onDeleteInstance, isDeleting]);

  return (
    <Flex direction="column" gap="5" style={{ padding: '0' }}>
      {/* ── Enabled By ── */}
      <SectionCard title="Enabled By">
        <Flex direction="column" gap="4">
          <InfoRow
            label="Member"
            value={
              instance.enabledBy ? (
                <Flex align="center" gap="2">
                  <Avatar
                    size="1"
                    fallback={instance.enabledBy.name.charAt(0)}
                    src={instance.enabledBy.avatar}
                    radius="full"
                  />
                  <Text size="2" style={{ color: 'var(--gray-12)' }}>
                    {instance.enabledBy.name}
                  </Text>
                </Flex>
              ) : (
                <Text size="2" style={{ color: 'var(--gray-11)' }}>-</Text>
              )
            }
          />
          <InfoRow
            label="Date"
            value={
              <Text size="2" style={{ color: 'var(--gray-12)' }}>
                {instance.createdAtTimestamp
                  ? new Date(instance.createdAtTimestamp).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '-'}
              </Text>
            }
          />
        </Flex>
      </SectionCard>

      {/* ── Import start date ── */}
      <SectionCard title="Import start date">
        <ReadOnlyField
          value={
            importStartDate
              ? new Date(importStartDate).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '-'
          }
          leadingIcon="date_range"
        />
      </SectionCard>

      {/* ── Sync Settings ── */}
      <SectionCard title="Sync Settings">
        <Flex direction="column" gap="4">
          {/* Sync Strategy */}
          <Flex direction="column" gap="1">
            <Flex direction="column" gap="2">
              <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
                Sync Strategy
              </Text>
              <ReadOnlyField value={syncStrategy} />
            </Flex>
            <Text size="1" weight="medium" style={{ color: 'var(--gray-10)' }}>
              Choose how data will be synchronized from {instance.name}
            </Text>
          </Flex>

          {/* Sync Interval (shown only for scheduled) */}
          {isScheduled && syncInterval && (
            <Flex direction="column" gap="1">
              <Flex direction="column" gap="2">
                <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
                  Sync Interval
                </Text>
                <ReadOnlyField value={syncInterval} />
              </Flex>
              <Text size="1" weight="medium" style={{ color: 'var(--gray-10)' }}>
                Set how often {instance.name} data is refreshed
              </Text>
            </Flex>
          )}
        </Flex>
      </SectionCard>

      {/* ── Danger Zone ── */}
      <Flex direction="column" gap="4">
        <Flex align="center" justify="center">
          <Text size="1" weight="medium" style={{ color: 'var(--gray-9)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Danger Zone
          </Text>
        </Flex>

        {/* Disable Instance */}
        <Flex
          direction="column"
          gap="3"
          style={{
            backgroundColor: 'var(--olive-2)',
            border: '1px solid var(--olive-3)',
            borderRadius: 'var(--radius-2)',
            padding: 16,
            minWidth: 325,
          }}
        >
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
                Disable Instance
              </Text>
              <Text size="1" style={{ color: 'var(--gray-10)' }}>
                Pause data syncing without removing this workspace
              </Text>
            </Flex>
            <Switch
              size="2"
              checked={!isActive}
              disabled={isToggling || isBeingDeleted}
              onCheckedChange={handleToggle}
              style={{ cursor: isToggling || isBeingDeleted ? 'not-allowed' : 'pointer' }}
            />
          </Flex>
        </Flex>

        {/* Permanently Delete Instance */}
        <Flex
          direction="column"
          gap="3"
          style={{
            backgroundColor: 'var(--olive-2)',
            border: '1px solid var(--olive-3)',
            borderRadius: 'var(--radius-2)',
            padding: 16,
            minWidth: 325,
          }}
        >
          <Flex justify="between" align="center">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" style={{ color: 'var(--gray-12)' }}>
                Permanently Delete Instance
              </Text>
              <Text size="1" style={{ color: 'var(--gray-10)' }}>
                Permanently remove this workspace and all synced data
              </Text>
            </Flex>
            <AlertDialog.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialog.Trigger>
                <Button
                  variant="outline"
                  color="red"
                  size="2"
                  disabled={isBeingDeleted}
                  style={{ cursor: isBeingDeleted ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                >
                  {isBeingDeleted ? 'Deleting...' : 'Delete Instance'}
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Content maxWidth="450px">
                <AlertDialog.Title>Delete Instance</AlertDialog.Title>
                <AlertDialog.Description>
                  Are you sure you want to delete <strong>{instance.name}</strong>? This action cannot be undone.
                  All synced data will be permanently removed.
                </AlertDialog.Description>
                {isActive && (
                  <Flex
                    align="center"
                    gap="2"
                    style={{
                      backgroundColor: 'var(--amber-a3)',
                      borderRadius: 'var(--radius-2)',
                      padding: '8px 12px',
                      marginTop: 8,
                    }}
                  >
                    <MaterialIcon name="warning" size={16} color="var(--amber-a11)" />
                    <Text size="2" style={{ color: 'var(--amber-a11)' }}>
                      This instance is currently active. Sync will be disabled first.
                    </Text>
                  </Flex>
                )}
                <Flex gap="3" mt="4" justify="end">
                  <AlertDialog.Cancel>
                    <Button variant="soft" color="gray" style={{ cursor: 'pointer' }}>
                      Cancel
                    </Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action>
                    <Button
                      variant="solid"
                      color="red"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      style={{ cursor: isDeleting ? 'not-allowed' : 'pointer' }}
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </AlertDialog.Action>
                </Flex>
              </AlertDialog.Content>
            </AlertDialog.Root>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}

// ========================================
// Sub-components
// ========================================

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Flex
      direction="column"
      gap="4"
      style={{
        backgroundColor: 'var(--olive-2)',
        border: '1px solid var(--olive-3)',
        borderRadius: 'var(--radius-2)',
        padding: 16,
        minWidth: 325,
      }}
    >
      <Flex direction="column" gap="4">
        <Text size="3" weight="medium" style={{ color: 'var(--gray-12)' }}>
          {title}
        </Text>
        <Box
          style={{
            height: 1,
            backgroundColor: 'var(--olive-3)',
            width: '100%',
          }}
        />
      </Flex>
      {children}
    </Flex>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Flex align="center" gap="4">
      <Text
        size="1"
        weight="medium"
        style={{
          color: 'var(--gray-10)',
          width: 164,
          flexShrink: 0,
        }}
      >
        {label}
      </Text>
      {value}
    </Flex>
  );
}

function ReadOnlyField({ value, leadingIcon }: { value: string; leadingIcon?: string }) {
  return (
    <Flex
      align="center"
      style={{
        height: 32,
        padding: '0 4px',
        backgroundColor: 'var(--gray-a3)',
        border: '1px solid var(--gray-a6)',
        borderRadius: 'var(--radius-2)',
      }}
    >
      {leadingIcon && (
        <Flex
          align="center"
          justify="center"
          style={{ padding: '0 4px' }}
        >
          <MaterialIcon name={leadingIcon} size={16} color="var(--gray-11)" />
        </Flex>
      )}
      <Flex
        align="center"
        style={{ flex: 1, padding: '0 4px' }}
      >
        <Text size="2" style={{ color: 'var(--gray-12)' }}>
          {value}
        </Text>
      </Flex>
    </Flex>
  );
}
