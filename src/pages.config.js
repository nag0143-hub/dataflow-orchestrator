/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AuditTrail from './pages/AuditTrail';
import CustomFunctions from './pages/CustomFunctions';
import DataCatalog from './pages/DataCatalog';
import DataModel from './pages/DataModel';
import LDAPIntegration from './pages/LDAPIntegration';
import Lineage from './pages/Lineage';
import Pipelines from './pages/Pipelines';
import Requirements from './pages/Requirements';
import UserGuide from './pages/UserGuide';
import Dashboard from './pages/Dashboard';
import ActivityLogs from './pages/ActivityLogs';
import Connections from './pages/Connections';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AuditTrail": AuditTrail,
    "CustomFunctions": CustomFunctions,
    "DataCatalog": DataCatalog,
    "DataModel": DataModel,
    "LDAPIntegration": LDAPIntegration,
    "Lineage": Lineage,
    "Pipelines": Pipelines,
    "Requirements": Requirements,
    "UserGuide": UserGuide,
    "Dashboard": Dashboard,
    "ActivityLogs": ActivityLogs,
    "Connections": Connections,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};