const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-foreground rounded-lg flex items-center justify-center">
            <span className="text-primary text-2xl font-bold">L</span>
          </div>
          <div>
            <p className="text-sm font-medium">Social Graph Analyzer</p>
            <p className="text-xs opacity-90">Universidad La Salle de Arequipa</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
