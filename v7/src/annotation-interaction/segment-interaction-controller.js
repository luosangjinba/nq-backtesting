import { createTwoAnchorInteractionController } from './two-anchor-interaction-controller.js';

/** Configure the generic two-anchor owner for Segment Geometry. */
export function createSegmentInteractionController(input = {}) {
  return createTwoAnchorInteractionController({
    ...input,
    createGeometryInput: (startAnchor, endAnchor) => Object.freeze({
      endAnchor,
      startAnchor,
    }),
    createGeometryMethod: 'createSegmentGeometry',
    toolLabel: 'Segment',
  });
}
