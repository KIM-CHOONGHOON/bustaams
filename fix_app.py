import re

with open('busTaams_web/src/App.jsx', 'r', encoding='utf-8') as f:
    raw = f.read()

# 1. First conflict (Imports)
# <<<<<<< HEAD ... ======= ... >>>>>>>
def replace_imports(m):
    return m.group(1) + "\n" + m.group(2)
raw = re.sub(r'<<<<<<< HEAD\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>.*?\n', replace_imports, raw, count=1)

# The rest of the App.jsx starting from function App() can just be replaced entirely 
# with the merged logic. Let's find "function App() {"
idx = raw.find('function App() {')
if idx != -1:
    before_app = raw[:idx]
    
    merged_app = """function App() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showDriverProfileModal, setShowDriverProfileModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'signup'
  const [userRole, setUserRole] = useState('customer');
  const [user, setUser] = useState(null);

  const [showBusInfoModal, setShowBusInfoModal] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showFindIdPasswordModal, setShowFindIdPasswordModal] = useState(false);
  const [findIdPasswordInitialTab, setFindIdPasswordInitialTab] = useState('id');
  const [driverView, setDriverView] = useState('dashboard'); // 'dashboard' | 'profileSetup'

  const handleLogout = () => {
    setUser(null);
  };
  
  const openFindIdPassword = (tab) => {
    setFindIdPasswordInitialTab(tab);
    setShowFindIdPasswordModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col font-body selection:bg-primary/20 selection:text-primary">
      <Header 
        setShowLoginModal={setShowLoginModal} 
        setShowDriverProfileModal={setShowDriverProfileModal} 
        setShowAccountSettings={setShowAccountSettings}
        setShowSignUpModal={() => setCurrentView('signup')}
        user={user}
        onLogout={handleLogout}
      />
      <main className="flex-1">
        {currentView === 'home' ? (
          user ? (
            user.userType === 'CONSUMER' || user.userType === 'TRAVELER' || user.userType === 'CUSTOMER' ? (
               <CustomerDashboard 
                 user={user} 
                 setShowAccountSettings={setShowAccountSettings} 
               />
            ) : user.userType === 'DRIVER' ? (
               driverView === 'profileSetup' ? (
                 <DriverProfileSetup 
                   currentUser={user} 
                   onBack={() => setDriverView('dashboard')} 
                 />
               ) : (
                 <DriverDashboard 
                   currentUser={user} 
                   onLogout={handleLogout} 
                   onProfileSetup={() => setDriverView('profileSetup')}
                   onBusInfoSetup={() => setShowBusInfoModal(true)}
                   onQuotationRequests={() => setShowQuotationModal(true)}
                 />
               )
            ) : user.userType === 'PARTNER' || user.userType === 'SALES' ? (
               <PartnerDashboard 
                 currentUser={user} 
                 onLogout={handleLogout}
               />
            ) : null
          ) : (
            <>
              <Hero user={user} setShowLoginModal={setShowLoginModal} />
              <Features user={user} />
              <SpringSpecial />
            </>
          )
        ) : (
          <SignupPage onBack={() => setCurrentView('home')} />
        )}
      </main>
      
      {currentView === 'home' && !user && <Footer />}
      
      {showLoginModal && (
        <LoginModal 
          close={() => setShowLoginModal(false)} 
          onLoginSuccess={(userData) => setUser(userData)} 
          setCurrentView={setCurrentView}
        />
      )}
      {showDriverProfileModal && (
        <DriverProfileModal 
          isOpen={showDriverProfileModal} 
          onClose={() => setShowDriverProfileModal(false)} 
          user={user} 
        />
      )}
      {showAccountSettings && (
        <AccountSettings 
          user={user} 
          onBack={() => setShowAccountSettings(false)} 
          onLogout={handleLogout}
        />
      )}
      {showSignUpModal && <SignUpModal close={() => setShowSignUpModal(false)} />}
      {showFindIdPasswordModal && (
        <FindIdPasswordModal
          close={() => setShowFindIdPasswordModal(false)}
          initialTab={findIdPasswordInitialTab}
        />
      )}
      {showBusInfoModal && <BusInformationSetup close={() => setShowBusInfoModal(false)} currentUser={user} />}
      {showQuotationModal && <QuotationRequests close={() => setShowQuotationModal(false)} currentUser={user} />}
    </div>
  );
}

export default App;
"""
    with open('busTaams_web/src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(before_app + merged_app)
    print("App.jsx fixed")
