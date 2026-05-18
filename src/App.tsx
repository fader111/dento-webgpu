import { useState, useRef, useCallback } from 'react'
import Scene3D, { type Scene3DHandle } from './Scene3D'
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
  Button,
  createTheme,
  ThemeProvider,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import SaveIcon from '@mui/icons-material/Save'
import UndoIcon from '@mui/icons-material/Undo'
import RedoIcon from '@mui/icons-material/Redo'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import ViewInArIcon from '@mui/icons-material/ViewInAr'
import CropFreeIcon from '@mui/icons-material/CropFree'
import MouseIcon from '@mui/icons-material/Mouse'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import ThreeDRotationIcon from '@mui/icons-material/ThreeDRotation'
import SettingsIcon from '@mui/icons-material/Settings'
import InfoIcon from '@mui/icons-material/Info'

const drawerWidth = 220

import { config } from './config'

const darkTheme = createTheme({
  palette: {
    mode: config.theme.mode,
    primary: { main: config.theme.primary },
    background: {
      default: config.theme.background,
      paper: config.theme.paper,
    },
    text: {
      primary: config.theme.textPrimary,
      secondary: config.theme.textSecondary,
    },
    action: {
      active: config.theme.iconColor,
    },
  },
  components: {
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: 12,
          minHeight: 24,
          paddingTop: 2,
          paddingBottom: 2,
        },
      },
    },
  },
})

function App() {
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [fileMenuAnchor, setFileMenuAnchor] = useState<null | HTMLElement>(null)
  const [editMenuAnchor, setEditMenuAnchor] = useState<null | HTMLElement>(null)
  const [viewMenuAnchor, setViewMenuAnchor] = useState<null | HTMLElement>(null)
  const [toolsMenuAnchor, setToolsMenuAnchor] = useState<null | HTMLElement>(null)
  const [helpMenuAnchor, setHelpMenuAnchor] = useState<null | HTMLElement>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const sceneRef = useRef<Scene3DHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleHistoryChange = useCallback((u: boolean, r: boolean) => {
    setCanUndo(u)
    setCanRedo(r)
  }, [])

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      sceneRef.current?.loadFile(file)
    }
    e.target.value = ''
  }, [])

  const handleMenuClose = () => {
    setFileMenuAnchor(null)
    setEditMenuAnchor(null)
    setViewMenuAnchor(null)
    setToolsMenuAnchor(null)
    setHelpMenuAnchor(null)
  }

  const toolbarItems = [
    { icon: <FolderOpenIcon />, tooltip: 'Open File', onClick: handleOpenFile },
    { icon: <SaveIcon />, tooltip: 'Save' },
    { divider: true },
    { icon: <UndoIcon />, tooltip: 'Undo', onClick: () => sceneRef.current?.undo(), disabled: !canUndo },
    { icon: <RedoIcon />, tooltip: 'Redo', onClick: () => sceneRef.current?.redo(), disabled: !canRedo },
    { divider: true },
    { icon: <MouseIcon />, tooltip: 'Select' },
    { icon: <OpenWithIcon />, tooltip: 'Move' },
    { icon: <ThreeDRotationIcon />, tooltip: 'Rotate' },
    { divider: true },
    { icon: <ZoomInIcon />, tooltip: 'Zoom In' },
    { icon: <ZoomOutIcon />, tooltip: 'Zoom Out' },
    { icon: <CropFreeIcon />, tooltip: 'Fit to Screen' },
  ]

  const sidebarItems = [
    { icon: <ViewInArIcon />, label: '3D Model' },
    { icon: <CropFreeIcon />, label: 'Sections' },
    { icon: <SettingsIcon />, label: 'Settings' },
    { icon: <InfoIcon />, label: 'Info' },
  ]

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <input
        ref={fileInputRef}
        type="file"
        accept=".obj,.stl"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Box sx={{ display: 'flex', height: '100vh', flexDirection: 'column' }}>
        {/* Menu Bar */}
        <AppBar position="static" elevation={0} sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
          <Toolbar variant="dense" sx={{ minHeight: 24, gap: 0 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              sx={{ mr: 1 }}
              size="small"
            >
              <MenuIcon fontSize="small" />
            </IconButton>

            <Button color="inherit" size="small" sx={{ fontSize: 12, py: 0, px: 0.75, minHeight: 24, textTransform: 'none' }} onClick={(e) => setFileMenuAnchor(e.currentTarget)}>
              File
            </Button>
            <Menu anchorEl={fileMenuAnchor} open={Boolean(fileMenuAnchor)} onClose={handleMenuClose}>
              <MenuItem onClick={() => { handleMenuClose(); handleOpenFile() }}>Open...</MenuItem>
              <MenuItem onClick={handleMenuClose}>Save</MenuItem>
              <MenuItem onClick={handleMenuClose}>Save As...</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Import STL</MenuItem>
              <MenuItem onClick={handleMenuClose}>Import OBJ</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Export...</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Exit</MenuItem>
            </Menu>

            <Button color="inherit" size="small" sx={{ fontSize: 12, py: 0, px: 0.75, minHeight: 24, textTransform: 'none' }} onClick={(e) => setEditMenuAnchor(e.currentTarget)}>
              Edit
            </Button>
            <Menu anchorEl={editMenuAnchor} open={Boolean(editMenuAnchor)} onClose={handleMenuClose}>
              <MenuItem onClick={handleMenuClose}>Undo</MenuItem>
              <MenuItem onClick={handleMenuClose}>Redo</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Select All</MenuItem>
              <MenuItem onClick={handleMenuClose}>Deselect</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Preferences</MenuItem>
            </Menu>

            <Button color="inherit" size="small" sx={{ fontSize: 12, py: 0, px: 0.75, minHeight: 24, textTransform: 'none' }} onClick={(e) => setViewMenuAnchor(e.currentTarget)}>
              View
            </Button>
            <Menu anchorEl={viewMenuAnchor} open={Boolean(viewMenuAnchor)} onClose={handleMenuClose}>
              <MenuItem onClick={handleMenuClose}>Reset Camera</MenuItem>
              <MenuItem onClick={handleMenuClose}>Front View</MenuItem>
              <MenuItem onClick={handleMenuClose}>Top View</MenuItem>
              <MenuItem onClick={handleMenuClose}>Side View</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Wireframe</MenuItem>
              <MenuItem onClick={handleMenuClose}>Solid</MenuItem>
              <Divider />
              <MenuItem onClick={handleMenuClose}>Fullscreen</MenuItem>
            </Menu>

            <Button color="inherit" size="small" sx={{ fontSize: 12, py: 0, px: 0.75, minHeight: 24, textTransform: 'none' }} onClick={(e) => setToolsMenuAnchor(e.currentTarget)}>
              Tools
            </Button>
            <Menu anchorEl={toolsMenuAnchor} open={Boolean(toolsMenuAnchor)} onClose={handleMenuClose}>
              <MenuItem onClick={() => { handleMenuClose(); sceneRef.current?.removeBase() }}>Remove Base</MenuItem>
            </Menu>

            <Button color="inherit" size="small" sx={{ fontSize: 12, py: 0, px: 0.75, minHeight: 24, textTransform: 'none' }} onClick={(e) => setHelpMenuAnchor(e.currentTarget)}>
              Help
            </Button>
            <Menu anchorEl={helpMenuAnchor} open={Boolean(helpMenuAnchor)} onClose={handleMenuClose}>
              <MenuItem onClick={handleMenuClose}>About</MenuItem>
              <MenuItem onClick={handleMenuClose}>Documentation</MenuItem>
            </Menu>

            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="caption" sx={{ opacity: 0.7 }}>
              Dento WebGPU
            </Typography>
          </Toolbar>
        </AppBar>

        {/* Toolbar */}
        <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar variant="dense" sx={{ minHeight: 36, gap: 0.25 }}>
            {toolbarItems.map((item, index) =>
              item.divider ? (
                <Divider key={index} orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              ) : (
                <Tooltip key={index} title={item.tooltip || ''} arrow>
                  <span>
                    <IconButton size="small" color="inherit" onClick={item.onClick} disabled={item.disabled}>
                      {item.icon}
                    </IconButton>
                  </span>
                </Tooltip>
              )
            )}
          </Toolbar>
        </AppBar>

        {/* Main content area */}
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          {/* Sidebar / Drawer */}
          <Drawer
            variant="persistent"
            open={drawerOpen}
            sx={{
              width: drawerOpen ? drawerWidth : 0,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                position: 'relative',
                boxSizing: 'border-box',
              },
            }}
          >
            <List dense>
              {sidebarItems.map((item) => (
                <ListItem key={item.label} disablePadding>
                  <ListItemButton>
                    <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Drawer>

          {/* Viewport / Canvas area */}
          <Box
            sx={{
              flexGrow: 1,
              display: 'flex',
              bgcolor: 'background.default',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Scene3D ref={sceneRef} modelUrl="/assets/01F4JV8X_lower.obj" onHistoryChange={handleHistoryChange} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  )
}

export default App
