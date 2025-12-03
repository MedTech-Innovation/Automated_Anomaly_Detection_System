import { Button } from "@/components/ui/button";
import { LogOut, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import logo from "@/assets/medtech-logo.png";

interface HeaderProps {
  onProfileClick: () => void;
}

/**
 * Header Component
 * 
 * Displays the MediTech Innov logo, app name, slogan, and user profile/logout buttons.
 * - Logo and branding are positioned on the left
 * - User actions are positioned on the right
 */
const Header = ({ onProfileClick }: HeaderProps) => {
  const { user, logout } = useAuth();

  return (
    <motion.header 
      className="border-b border-border bg-gradient-to-r from-white via-blue-50/30 to-indigo-50/30 
        shadow-lg backdrop-blur-md sticky top-0 z-50"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Branding Section - Left */}
          <motion.div 
            className="flex items-center gap-4"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <motion.img 
              src={logo} 
              alt="MediTech Innov Logo" 
              className="h-14 w-auto object-contain"
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <div className="hidden md:block">
              <motion.h1 
                className="text-2xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 
                  bg-clip-text text-transparent"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                MedTech Innovation
              </motion.h1>
              <motion.p 
                className="text-xs text-slate-600 font-medium mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                Detect, Diagnose, and Defend
              </motion.p>
            </div>
          </motion.div>

          {/* User Actions Section - Right */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {user && (
              <motion.span 
                className="text-sm text-slate-700 font-medium hidden sm:inline bg-gradient-to-r 
                  from-slate-100 to-slate-50 px-4 py-2 rounded-lg border border-slate-200"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                {user.fullName}
              </motion.span>
            )}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={onProfileClick}
                className="gap-2 border-slate-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 
                  hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <UserCircle className="w-4 h-4" />
              Profile
            </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
                className="gap-2 border-slate-300 hover:bg-gradient-to-r hover:from-red-50 hover:to-orange-50 
                  hover:border-red-400 hover:text-red-700 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
