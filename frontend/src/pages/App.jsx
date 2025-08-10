import React from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from './Home';
import Merge from './Merge';
import Convert from './Convert';
import Split from './Split';
import Compress from './Compress';
import Edit from './Edit';
import Sign from './Sign';
import Compare from './Compare';
import Watermark from './Watermark';
import PageNum from './PageNum';
import Reorder from './Reorder';
import Extract from './Extract';
import Remove from './Remove';
import Rotate from './Rotate';
import Unprotect from './Unprotect';
import Protect from './Protect';
import ExtractImg from './ExtractImg';
import Img2Pdf from './Img2Pdf';
import Pdf2Img from './Pdf2Img';

export default function App() {
  const { i18n } = useTranslation()
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/convert" element={<Convert />} />
          <Route path="/merge" element={<Merge />} />
          <Route path="/split" element={<Split />} />
          <Route path="/compress" element={<Compress />} />
          <Route path="/edit" element={<Edit />} />
          <Route path="/sign" element={<Sign />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/watermark" element={<Watermark />} />
          <Route path="/pagenum" element={<PageNum />} />
          <Route path="/reorder" element={<Reorder />} />
          <Route path="/extract" element={<Extract />} />
          <Route path="/remove" element={<Remove />} />
          <Route path="/rotate" element={<Rotate />} />
          <Route path="/unprotect" element={<Unprotect />} />
          <Route path="/protect" element={<Protect />} />
          <Route path="/extractimg" element={<ExtractImg />} />
          <Route path="/img2pdf" element={<Img2Pdf />} />
          <Route path="/pdf2img" element={<Pdf2Img />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
