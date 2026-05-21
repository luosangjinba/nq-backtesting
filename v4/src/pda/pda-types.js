// PDA type registry for manual, session-scoped annotations.

export const PDA_TYPES = {
  bsl: {
    id: 'bsl',
    label: 'BSL',
    shape: 'liquidity-line',
    color: '#26a69a',
    textColor: '#b2dfdb',
    priceField: 'high',
    labelPosition: 'above',
    objective: false,
    pointSet: false,
  },
  ssl: {
    id: 'ssl',
    label: 'SSL',
    shape: 'liquidity-line',
    color: '#ef5350',
    textColor: '#ffcdd2',
    priceField: 'low',
    labelPosition: 'below',
    objective: false,
    pointSet: false,
  },
  fvg: {
    id: 'fvg',
    label: 'FVG',
    shape: 'range',
    color: '#ab47bc',
    objective: false,
    pointSet: false,
  },
  ob: {
    id: 'ob',
    label: 'OB',
    shape: 'range',
    color: '#ffa726',
    objective: false,
    pointSet: false,
  },
  ndow: {
    id: 'ndow',
    label: 'NDOW',
    shape: 'range',
    color: '#42a5f5',
    objective: true,
    pointSet: false,
  },
  nwog: {
    id: 'nwog',
    label: 'NWOG',
    shape: 'range',
    color: '#7e57c2',
    objective: true,
    pointSet: false,
  },
  eqh: {
    id: 'eqh',
    label: 'EQH',
    shape: 'point-set',
    color: '#26a69a',
    objective: false,
    pointSet: true,
  },
  eql: {
    id: 'eql',
    label: 'EQL',
    shape: 'point-set',
    color: '#ef5350',
    objective: false,
    pointSet: true,
  },
};

export function getPdaType(type) {
  return PDA_TYPES[type] || null;
}
