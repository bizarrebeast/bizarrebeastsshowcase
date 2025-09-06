# BUTQ Character Showcase Tool - Game Plan

## Project Overview
A web-based tool that transforms high-resolution character images into polished 2000x2000 showcases with animations, backgrounds, and effects. Designed specifically for showcasing character and player artwork from Bizarre Underground Treasure Quest (BUTQ).

## Core Objectives
- Create professional character showcases from hand-drawn artwork
- Port BUTQ animation sequences for dynamic presentations
- Enable easy export in multiple formats (PNG, GIF, MP4)
- Provide preset configurations for different character types

## Technical Stack

### Frontend Framework
- **React 18** with TypeScript for robust component architecture
- **Vite** as build tool for fast development and optimized production builds
- **Tailwind CSS** for responsive UI design

### Canvas & Animation
- **Konva.js** for canvas manipulation and layer management
- **GSAP** for smooth animation timelines and transitions
- **Custom frame interpolation** for hand-drawn art (non-pixel art)

### Export Libraries
- **gif.js** for animated GIF generation
- **MediaRecorder API** for MP4/WebM video export
- **Native Canvas API** for PNG export

## Deployment Strategy
- **Subdomain**: showcase.yourdomain.com
- **Static hosting** (no backend required initially)
- **CDN-ready** asset optimization
- **Progressive Web App** capabilities for offline use

## Project Structure

```
showcase/
├── src/
│   ├── animations/
│   │   ├── characters/       # BUTQ character animations
│   │   │   ├── player.ts     # Idle, walk, jump sequences
│   │   │   ├── cat.ts        # Prowl, pounce, stalk
│   │   │   ├── rex.ts        # Chomp, lunge
│   │   │   ├── beetle.ts     # Scuttle patterns
│   │   │   └── baseBlu.ts    # Float, hover
│   │   ├── sequencer.ts      # Frame interpolation engine
│   │   └── timeline.ts       # Animation timeline control
│   │
│   ├── components/
│   │   ├── Canvas/
│   │   │   ├── ShowcaseCanvas.tsx    # Main 2000x2000 workspace
│   │   │   ├── LayerManager.tsx      # Layer ordering & visibility
│   │   │   ├── CharacterLayer.tsx    # Character rendering
│   │   │   └── GridOverlay.tsx       # Positioning grid
│   │   │
│   │   ├── Controls/
│   │   │   ├── AnimationTimeline.tsx # Timeline scrubber
│   │   │   ├── TransformControls.tsx # Scale, rotate, position
│   │   │   └── EffectsPanel.tsx      # Effects configuration
│   │   │
│   │   ├── FileManager/
│   │   │   ├── ImageUploader.tsx     # Drag & drop upload
│   │   │   ├── AssetLibrary.tsx      # Pre-loaded assets
│   │   │   └── FolderSelector.tsx    # Bulk import
│   │   │
│   │   ├── PresetSystem/
│   │   │   ├── PresetSelector.tsx    # Character preset dropdown
│   │   │   ├── PresetEditor.tsx      # Custom preset creation
│   │   │   └── PresetManager.tsx     # Save/load presets
│   │   │
│   │   └── Export/
│   │       ├── ExportDialog.tsx      # Export options UI
│   │       ├── FormatSelector.tsx    # PNG/GIF/Video selection
│   │       └── QualitySettings.tsx   # Resolution & compression
│   │
│   ├── effects/
│   │   ├── particles/        # Particle system effects
│   │   ├── glows/           # Glow and aura effects
│   │   ├── backgrounds/     # Dynamic backgrounds
│   │   └── filters/         # Image filters & blends
│   │
│   ├── presets/
│   │   ├── characters.ts    # Character-specific configs
│   │   ├── animations.ts    # Animation sequences
│   │   ├── backgrounds.ts   # Background styles
│   │   └── effects.ts       # Effect combinations
│   │
│   ├── utils/
│   │   ├── imageProcessor.ts        # Handle 300dpi conversion
│   │   ├── animationExtractor.ts    # Port BUTQ animations
│   │   ├── exportManager.ts         # Export pipeline
│   │   ├── storageManager.ts        # LocalStorage/IndexedDB
│   │   └── performanceMonitor.ts    # FPS & memory tracking
│   │
│   └── types/
│       ├── animation.types.ts
│       ├── preset.types.ts
│       └── export.types.ts
```

## Feature Breakdown

### Phase 1: Core Foundation (Week 1)
**Goal**: Basic functional canvas with image handling

#### Tasks:
- [x] Initialize React + TypeScript + Vite project
- [ ] Set up Tailwind CSS and base styling
- [ ] Implement Konva.js canvas (2000x2000)
- [ ] Create image upload system
- [ ] Handle 300dpi image processing (14"x14" → 2000px)
- [ ] Basic drag & drop positioning
- [ ] Layer management system
- [ ] Grid overlay for alignment

#### Deliverables:
- Functional canvas workspace
- Image upload and positioning
- Basic UI layout

### Phase 2: Animation System (Week 2)
**Goal**: Port BUTQ animations and create timeline

#### Tasks:
- [ ] Extract player animations from BUTQ
- [ ] Extract enemy movement patterns
- [ ] Build frame sequencer with interpolation
- [ ] Create animation timeline UI
- [ ] Implement playback controls
- [ ] Add loop options
- [ ] Frame duration adjustment

#### Animation Library:
```typescript
// Player Animations
- idle_breathing (subtle up/down)
- walk_cycle (8 frames)
- jump_sequence (launch, air, land)
- victory_pose

// Enemy Animations
- cat_prowl (smooth stalking)
- cat_pounce (quick attack)
- rex_chomp (jaw animation)
- beetle_scuttle (rapid movement)
- baseblu_float (hovering motion)
```

### Phase 3: Preset System (Week 3)
**Goal**: Character-specific configurations

#### Tasks:
- [ ] Design preset data structure
- [ ] Create preset selector UI
- [ ] Implement character presets
- [ ] Build save/load functionality
- [ ] Add preset customization
- [ ] LocalStorage integration
- [ ] Import/export presets

#### Preset Structure:
```typescript
interface CharacterPreset {
  id: string
  name: string
  category: 'player' | 'enemy' | 'npc' | 'custom'
  thumbnail: string
  
  animation: {
    sequence: AnimationSequence
    speed: number
    loop: boolean
  }
  
  transform: {
    scale: number
    rotation: number
    position: { x: number, y: number }
  }
  
  effects: {
    glow?: GlowConfig
    particles?: ParticleConfig
    aura?: AuraConfig
  }
  
  background: {
    type: 'solid' | 'gradient' | 'image'
    config: BackgroundConfig
  }
}
```

### Phase 4: Effects & Polish (Week 4)
**Goal**: Visual effects and backgrounds

#### Tasks:
- [ ] Implement glow effects
- [ ] Create particle systems
- [ ] Add aura effects
- [ ] Build background system
- [ ] Implement blend modes
- [ ] Add motion blur
- [ ] Create effect presets

#### Effect Types:
- **Glow**: Soft, hard, colored
- **Particles**: Sparkles, dust, energy
- **Aura**: Golden, dark, elemental
- **Backgrounds**: Solid, gradient, image, animated

### Phase 5: Export System (Week 5)
**Goal**: Multi-format export capabilities

#### Tasks:
- [ ] PNG export (2000x2000)
- [ ] GIF generation with quality options
- [ ] MP4 video export
- [ ] WebM video export
- [ ] Batch export functionality
- [ ] Export queue system
- [ ] Progress indicators

#### Export Options:
```typescript
interface ExportConfig {
  format: 'png' | 'gif' | 'mp4' | 'webm'
  resolution: number // 2000 default
  quality: number // 0-100
  fps?: number // for animated formats
  duration?: number // for video
  loop?: boolean // for gif/video
  transparency?: boolean // for png/webm
}
```

## Data Flow

### Image Processing Pipeline
1. **Input**: High-res hand-drawn image (14"x14" @ 300dpi = 4200x4200px)
2. **Processing**: Scale to fit 2000x2000 maintaining aspect ratio
3. **Enhancement**: Apply anti-aliasing and sharpening
4. **Storage**: Cache processed image in IndexedDB
5. **Display**: Render on Konva.js layer

### Animation Pipeline
1. **Load**: Character preset with animation sequence
2. **Interpolate**: Smooth transitions between frames
3. **Apply**: Transform and effects per frame
4. **Render**: Update canvas at 60 FPS
5. **Export**: Capture frames for GIF/video

## Performance Targets
- **Canvas FPS**: 60 FPS minimum
- **Image Load**: < 2 seconds for 4200x4200px
- **Export Time**: < 10 seconds for 5-second GIF
- **Memory Usage**: < 500MB active
- **Bundle Size**: < 2MB initial load

## Browser Support
- Chrome 90+ (primary)
- Firefox 88+
- Safari 14+
- Edge 90+

## Storage Strategy
- **LocalStorage**: User preferences, recent presets
- **IndexedDB**: Processed images, custom presets, export cache
- **Session Storage**: Temporary animation states

## Security Considerations
- Client-side only (no server uploads)
- CORS handling for background images
- Sanitize file inputs
- Limit file sizes (max 50MB per image)

## Future Enhancements (V2)
- [ ] Multi-character scenes
- [ ] Advanced particle editor
- [ ] Custom animation creator
- [ ] AI-powered background removal
- [ ] Collaborative sharing
- [ ] Cloud preset library
- [ ] Animation marketplace
- [ ] Mobile app version

## Success Metrics
- Load time under 3 seconds
- Export quality matches source
- Smooth 60 FPS animations
- Intuitive UI (< 5 min learning curve)
- Support for 20+ characters

## Development Timeline

### Week 1 (Foundation)
- Mon-Tue: Project setup, Canvas implementation
- Wed-Thu: Image processing, drag & drop
- Fri: Layer system, grid overlay

### Week 2 (Animation)
- Mon-Tue: Extract BUTQ animations
- Wed-Thu: Frame sequencer, timeline
- Fri: Playback controls, testing

### Week 3 (Presets)
- Mon-Tue: Preset system architecture
- Wed-Thu: UI implementation
- Fri: Save/load functionality

### Week 4 (Effects)
- Mon-Tue: Glow and particle effects
- Wed-Thu: Background system
- Fri: Effect combinations, presets

### Week 5 (Export & Polish)
- Mon-Tue: Export system
- Wed-Thu: Performance optimization
- Fri: Final testing, documentation

## Testing Strategy
- Unit tests for animation logic
- Integration tests for export pipeline
- Performance testing with large images
- Cross-browser compatibility testing
- User acceptance testing with sample artwork

## Documentation Requirements
- User guide with screenshots
- Animation preset reference
- Export format specifications
- Troubleshooting guide
- API documentation for preset format

## Launch Checklist
- [ ] All core features implemented
- [ ] Performance targets met
- [ ] Cross-browser tested
- [ ] Documentation complete
- [ ] Export formats verified
- [ ] Preset library populated
- [ ] Subdomain configured
- [ ] Analytics integrated
- [ ] Error tracking setup
- [ ] Initial user feedback collected

---

## Next Steps
1. Set up React project with Vite
2. Install core dependencies (Konva, GSAP, Tailwind)
3. Create basic canvas component
4. Implement image upload handler
5. Begin BUTQ animation extraction