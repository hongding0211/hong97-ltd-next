# Frontend Package

This package contains the frontend application for the hong97-ltd-next project.

## Features

### Trash Page
- **Pull-to-Refresh**: Swipe down from the top of the page to refresh the content
- **Infinite Scroll**: Automatically loads more content when scrolling to the bottom
- **Date Grouping**: Content is automatically grouped by date (Today, Yesterday, etc.)
- **Real-time Updates**: Comments and likes are updated in real-time
- **Admin Controls**: Administrators can create and delete content

### Pull-to-Refresh Implementation
The pull-to-refresh functionality is implemented using touch events:

1. **Touch Detection**: Detects when the user starts touching the screen at the top of the content
2. **Pull Distance**: Calculates the pull distance and shows visual feedback
3. **Threshold**: Triggers refresh when pulled down more than 50px
4. **Visual Indicators**: Shows different states:
   - "Pull to refresh" when starting to pull
   - "Release to refresh" when threshold is reached
   - "Refreshing..." during the refresh process
5. **Smooth Animation**: Content smoothly follows the pull gesture with easing

### Technical Details
- Uses `useRef` for DOM references and touch state management
- Implements touch event listeners with proper cleanup
- Provides visual feedback through CSS transforms and opacity
- Handles both success and error states with toast notifications
- Maintains scroll position during refresh operations

## Development

To run the development server:

```bash
npm run dev
```

To build for production:

```bash
npm run build
```

## Dependencies

- Next.js for the framework
- Tailwind CSS for styling
- Lucide React for icons
- next-i18next for internationalization
