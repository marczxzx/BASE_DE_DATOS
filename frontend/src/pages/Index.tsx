import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Map from "@/components/Map";
import { LoadingStateProvider } from "@/contexts/LoadingStateContext";

const Index = () => {
  return (
    <LoadingStateProvider>
      <div className="flex flex-col h-screen">
        <Navbar />
        <main className="flex-1 overflow-hidden">
          <Map />
        </main>
        <Footer />
      </div>
    </LoadingStateProvider>
  );
};

export default Index;
