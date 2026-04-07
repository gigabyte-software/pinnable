# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-04-07

### Added
- Canvas-based pinnable image component
- Zoom and pan (mouse wheel, pinch-to-zoom, one-finger drag)
- Long-press pin placement with radial progress ring (1s grace + 0.75s ring)
- Gesture locking: pinch and pan don't interfere across finger lifts
- Pin edit popover with label, icon, color, and delete
- Pin icon selection: 20+ built-in emoji icons and custom image icon support
- Pin color picker with configurable swatches
- Label visibility and connector line toggles per pin
- Draggable labels with dashed connector lines to pins
- View state persistence (zoom level and pan position)
- Rasterized image export (`exportImage()`) with pins baked in at full resolution
- Icon whitelist filtering via `availableIcons` option
- Custom icon support via `customIcons` option (SVG/PNG)
- High-DPI / Retina display support
- Haptic feedback on pin placement (supported devices)
- Normalized (0..1) coordinate storage for resolution independence
- Sample app with localforage persistence
