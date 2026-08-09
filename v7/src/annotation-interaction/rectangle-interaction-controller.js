import { createTwoAnchorInteractionController } from './two-anchor-interaction-controller.js';

/** Configure the generic two-anchor owner for normalized Rectangle Geometry. */
export function createRectangleInteractionController(input = {}) {
  return createTwoAnchorInteractionController({
    ...input,
    createGeometryInput: (firstAnchor, secondAnchor) => Object.freeze({
      firstAnchor,
      secondAnchor,
    }),
    createGeometryMethod: 'createRectangleGeometry',
    toolLabel: 'Rectangle',
  });
}
