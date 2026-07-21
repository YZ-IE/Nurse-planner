import { describe, it, expect } from 'vitest';
import { parseTransmissionSheet, nameToInitials } from '../transmissionParser.js';

describe('parseTransmissionSheet — champs étiquetés, un par ligne', () => {
  it('extrait chambre / nom / âge / motif sur un patient unique', () => {
    const text = [
      'Chambre: 12',
      'Nom: DUPONT Jean',
      'Age: 45',
      'Motif: Fracture du fémur',
    ].join('\n');

    const result = parseTransmissionSheet(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ room: '12', name: 'DUPONT Jean', age: 45, reason: 'Fracture du fémur' });
  });

  it('gère plusieurs patients séparés par leur numéro de chambre', () => {
    const text = [
      'Chambre 12',
      'Nom: DUPONT Jean',
      'Âge: 45',
      'Motif: Fracture du fémur',
      '',
      'Chambre 14',
      'Nom: MARTIN Sophie',
      'Âge: 78',
      'Motif: AVC ischémique',
    ].join('\n');

    const result = parseTransmissionSheet(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ room: '12', name: 'DUPONT Jean', age: 45, reason: 'Fracture du fémur' });
    expect(result[1]).toMatchObject({ room: '14', name: 'MARTIN Sophie', age: 78, reason: 'AVC ischémique' });
  });

  it('reconnaît les libellés abrégés (Ch., Pt, Dx)', () => {
    const text = [
      'Ch.101B',
      'Pt: BERNARD Alice',
      'Dx: Pneumopathie',
    ].join('\n');

    const result = parseTransmissionSheet(text);
    expect(result).toHaveLength(1);
    expect(result[0].room).toBe('101B');
    expect(result[0].name).toBe('BERNARD Alice');
    expect(result[0].reason).toBe('Pneumopathie');
    expect(result[0].age).toBeNull();
  });
});

describe('parseTransmissionSheet — champs combinés sur une même ligne', () => {
  it('extrait nom, âge et motif depuis une ligne libre séparée par des virgules', () => {
    const text = 'Chambre 12 - DUPONT Jean, 45 ans, fracture du fémur';
    const result = parseTransmissionSheet(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ room: '12', name: 'DUPONT Jean', age: 45, reason: 'fracture du fémur' });
  });

  it("reconnaît l'âge écrit sous la forme '78a' quand les champs sont séparés par des virgules", () => {
    const text = [
      'Chambre 7',
      'MARTIN Sophie, 78a, AVC',
    ].join('\n');
    const result = parseTransmissionSheet(text);
    expect(result[0].age).toBe(78);
    expect(result[0].name).toBe('MARTIN Sophie');
    expect(result[0].reason).toBe('AVC');
  });

  it('reconnaît un motif introduit par un mot-clé au milieu de la ligne libre', () => {
    const text = [
      'Chambre 9',
      'PETIT Marc 60 ans motif: douleur thoracique',
    ].join('\n');
    const result = parseTransmissionSheet(text);
    expect(result[0].age).toBe(60);
    expect(result[0].name).toBe('PETIT Marc');
    expect(result[0].reason).toBe('douleur thoracique');
  });
});

describe('parseTransmissionSheet — champs manquants', () => {
  it("laisse l'âge à null quand il est absent, sans jamais l'inventer", () => {
    const text = [
      'Chambre 14',
      'MARTIN Sophie',
      'Motif: AVC',
    ].join('\n');
    const result = parseTransmissionSheet(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ room: '14', name: 'MARTIN Sophie', age: null, reason: 'AVC' });
  });

  it('laisse le motif à null quand il est absent', () => {
    const text = [
      'Chambre 3',
      'Nom: LEROY Paul',
      'Age: 33',
    ].join('\n');
    const result = parseTransmissionSheet(text);
    expect(result[0]).toEqual({ room: '3', name: 'LEROY Paul', age: 33, reason: null });
  });

  it('laisse le nom à null quand un bloc ne contient que la chambre et le motif', () => {
    const text = [
      'Chambre 5',
      'Motif: Surveillance post-opératoire',
    ].join('\n');
    const result = parseTransmissionSheet(text);
    expect(result[0]).toEqual({ room: '5', name: null, age: null, reason: 'Surveillance post-opératoire' });
  });

  it('retourne un tableau vide pour un texte vide ou vide de sens', () => {
    expect(parseTransmissionSheet('')).toEqual([]);
    expect(parseTransmissionSheet('   \n  \n')).toEqual([]);
    expect(parseTransmissionSheet(null)).toEqual([]);
    expect(parseTransmissionSheet(undefined)).toEqual([]);
  });
});

describe('nameToInitials', () => {
  it('dérive les initiales prénom + nom', () => {
    expect(nameToInitials('Jean DUPONT')).toBe('J.D');
    expect(nameToInitials('DUPONT Jean')).toBe('D.J');
  });

  it('gère un nom à un seul mot', () => {
    expect(nameToInitials('Dupont')).toBe('D.');
  });

  it('gère les noms composés (plusieurs espaces)', () => {
    expect(nameToInitials('Jean-Pierre DE LA TOUR')).toBe('J.T');
  });

  it('retourne une chaîne vide pour une entrée absente', () => {
    expect(nameToInitials(null)).toBe('');
    expect(nameToInitials('')).toBe('');
    expect(nameToInitials(undefined)).toBe('');
  });
});
