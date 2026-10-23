import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTournamentTabs } from './useTournamentTabs';
import { computeTournamentFlags } from '../utils/tournament-flags';
import type { Tournament } from '../types/tournament';

const baseTournament = (over: Partial<Tournament> = {}): Tournament =>
  ({
    id: 't1',
    name: 'Torneo Test',
    dateStart: '2024-01-01',
    numPlayers: 16,
    status: 'Programado',
    rounds: 'GruposKnockout',
    typeKnockout: 'LlaveA',
    ...over,
  } as Tournament);

const flagsOf = (t: Tournament | null) => {
  const f = computeTournamentFlags(t);
  return [f.isProgramado, f.isGrupos, f.isKnockoutPhase, f.isCompletado, f.hasGroupsFormat, f.hasKnockoutFormat] as const;
};

describe('useTournamentTabs', () => {
  it('inicializa con la pestana informacion activa y grupos/brackets nulos', () => {
    const t = baseTournament();
    const { result } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    expect(result.current.activeTab).toBe('info');
    expect(result.current.selectedGroup).toBeNull();
    expect(result.current.subBracketA).toBeNull();
    expect(result.current.subBracketB).toBeNull();
    expect(result.current.groupOptions).toEqual([]);
  });

  it('visibleTabs incluye Informacion siempre, y Inscritos solo en fase Programado', () => {
    const programado = baseTournament({ status: 'Programado' });
    const { result: rp } = renderHook(() =>
      useTournamentTabs(programado, false, ...flagsOf(programado)),
    );
    expect(rp.current.visibleTabs.map((t) => t.value)).toContain('info');
    expect(rp.current.visibleTabs.map((t) => t.value)).toContain('inscritos');

    const completado = baseTournament({ status: 'Completado' });
    const { result: rc } = renderHook(() =>
      useTournamentTabs(completado, false, ...flagsOf(completado)),
    );
    expect(rc.current.visibleTabs.map((t) => t.value)).not.toContain('inscritos');
    expect(rc.current.visibleTabs.map((t) => t.value)).toContain('resultados');
  });

  it('setActiveTab actualiza la pestana activa (y permite null)', () => {
    const t = baseTournament({ status: 'Completado' });
    const { result } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    act(() => result.current.setActiveTab('grupos'));
    expect(result.current.activeTab).toBe('grupos');
    act(() => result.current.setActiveTab(null));
    expect(result.current.activeTab).toBeNull();
  });

  it('setSelectedGroup actualiza el grupo seleccionado', () => {
    const t = baseTournament();
    const { result } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    act(() => result.current.setSelectedGroup('3'));
    expect(result.current.selectedGroup).toBe('3');
  });

  it('setSubBracketA / setSubBracketB actualizan los brackets', () => {
    const t = baseTournament();
    const { result } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    act(() => {
      result.current.setSubBracketA('r1');
      result.current.setSubBracketB('r2');
    });
    expect(result.current.subBracketA).toBe('r1');
    expect(result.current.subBracketB).toBe('r2');
  });

  it('setGroupOptions actualiza las opciones de grupo', () => {
    const t = baseTournament();
    const { result } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    act(() =>
      result.current.setGroupOptions([
        { value: '1', label: 'Grupo 1' },
        { value: '2', label: 'Grupo 2' },
      ]),
    );
    expect(result.current.groupOptions).toHaveLength(2);
    expect(result.current.groupOptions[0]).toEqual({ value: '1', label: 'Grupo 1' });
  });

  it('mantiene el state aislado entre instancias (no state compartido)', () => {
    const t = baseTournament({ status: 'Completado' });
    const { result: a } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    const { result: b } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    act(() => a.current.setActiveTab('grupos'));
    expect(a.current.activeTab).toBe('grupos');
    expect(b.current.activeTab).toBe('info');
  });

  it('expones todos los manejadores requeridos por UseTournamentTabsResult', () => {
    const t = baseTournament();
    const { result } = renderHook(() =>
      useTournamentTabs(t, false, ...flagsOf(t)),
    );
    expect(typeof result.current.setActiveTab).toBe('function');
    expect(typeof result.current.setSelectedGroup).toBe('function');
    expect(typeof result.current.setSubBracketA).toBe('function');
    expect(typeof result.current.setSubBracketB).toBe('function');
    expect(typeof result.current.setGroupOptions).toBe('function');
  });
});