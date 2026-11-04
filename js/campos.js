// GENERADO por herramientas/generar_campos.py a partir de campos.json. No editar a mano.
export const CAMPOS = {
 "version": "5.6",
 "pais_mapa": "España",
 "carpeta_fotos": "Imagenes/Aportaciones",
 "patron_expediente": "^(\\d+)\\s*-\\s*(EDP\\d+)",
 "nombre_archivo": "Información {EXP_NUMERO}",
 "archivo_actividad": "Registro de actividad {EXP_NUMERO}.txt",
 "secciones": [
  {
   "titulo": "Expediente",
   "campos": [
    {
     "etiqueta": "EXP_NUMERO",
     "texto": "Nº de expediente",
     "tipo": "numero_expediente"
    },
    {
     "etiqueta": "EXP_EDP",
     "texto": "EDP"
    },
    {
     "etiqueta": "FECHA",
     "texto": "Fecha",
     "tipo": "fecha"
    },
    {
     "etiqueta": "FECHA_CIERRE",
     "texto": "Fecha de cierre",
     "tipo": "fecha"
    },
    {
     "etiqueta": "JUDICIALIZADO",
     "texto": "Judicial",
     "tipo": "casilla",
     "completo": true,
     "texto_casilla": "Expediente judicializado (el informe se ha aportado o se aportará a un procedimiento judicial)"
    },
    {
     "etiqueta": "JUDICIAL_PROCEDIMIENTO",
     "texto": "Procedimiento y juzgado",
     "completo": true
    },
    {
     "etiqueta": "JUDICIAL_FIN",
     "texto": "Fin del procedimiento (sentencia firme)",
     "tipo": "fecha"
    }
   ]
  },
  {
   "titulo": "Datos personales",
   "campos": [
    {
     "etiqueta": "NOMBRE",
     "texto": "Nombre"
    },
    {
     "etiqueta": "APELLIDOS",
     "texto": "Apellidos"
    },
    {
     "etiqueta": "FECHA_NAC",
     "texto": "Fecha nac.",
     "tipo": "fecha"
    },
    {
     "etiqueta": "EDAD",
     "texto": "Edad"
    },
    {
     "etiqueta": "DNI_NIE",
     "texto": "DNI/NIE"
    },
    {
     "etiqueta": "NSS",
     "texto": "N.º Seg. Social"
    },
    {
     "etiqueta": "ESTADO_CIVIL",
     "texto": "Estado civil",
     "tipo": "lista"
    },
    {
     "etiqueta": "MASCOTA",
     "texto": "Mascota"
    },
    {
     "etiqueta": "FOTO_INVESTIGADO",
     "texto": "Fotografía principal",
     "tipo": "imagen"
    },
    {
     "etiqueta": "ESTATURA",
     "texto": "Estatura"
    },
    {
     "etiqueta": "PESO",
     "texto": "Peso"
    },
    {
     "etiqueta": "COLOR_PELO",
     "texto": "Color de pelo",
     "tipo": "lista"
    },
    {
     "etiqueta": "MORFOLOGIA",
     "texto": "Morfología corporal",
     "tipo": "lista"
    },
    {
     "etiqueta": "GALERIA_INVESTIGADO",
     "texto": "Más fotografías del investigado",
     "tipo": "galeria"
    }
   ]
  },
  {
   "titulo": "Direcciones",
   "campos": [
    {
     "etiqueta": "DIRECCION_1",
     "texto": "Dirección 1",
     "completo": true,
     "enlace_mapa": true,
     "consulta_mapa": [
      "DIRECCION_1",
      "POBLACION_1",
      "PROVINCIA_1"
     ]
    },
    {
     "etiqueta": "POBLACION_1",
     "texto": "Población"
    },
    {
     "etiqueta": "PROVINCIA_1",
     "texto": "Provincia"
    },
    {
     "etiqueta": "DIRECCION_2",
     "texto": "Dirección 2",
     "completo": true,
     "enlace_mapa": true,
     "consulta_mapa": [
      "DIRECCION_2",
      "POBLACION_2",
      "PROVINCIA_2"
     ]
    },
    {
     "etiqueta": "POBLACION_2",
     "texto": "Población"
    },
    {
     "etiqueta": "PROVINCIA_2",
     "texto": "Provincia"
    },
    {
     "etiqueta": "DIRECCION_3",
     "texto": "Dirección 3",
     "completo": true,
     "enlace_mapa": true,
     "consulta_mapa": [
      "DIRECCION_3",
      "POBLACION_3",
      "PROVINCIA_3"
     ]
    },
    {
     "etiqueta": "POBLACION_3",
     "texto": "Población"
    },
    {
     "etiqueta": "PROVINCIA_3",
     "texto": "Provincia"
    },
    {
     "etiqueta": "DIRECCION_4",
     "texto": "Dirección 4",
     "completo": true,
     "enlace_mapa": true,
     "consulta_mapa": [
      "DIRECCION_4",
      "POBLACION_4",
      "PROVINCIA_4"
     ]
    },
    {
     "etiqueta": "POBLACION_4",
     "texto": "Población"
    },
    {
     "etiqueta": "PROVINCIA_4",
     "texto": "Provincia"
    },
    {
     "etiqueta": "PROPIEDADES_RESUMEN",
     "texto": "Resultado del Registro de la Propiedad",
     "tipo": "multilinea",
     "completo": true
    },
    {
     "etiqueta": "PROPIEDADES",
     "texto": "Propiedades (Registro)",
     "tipo": "vehiculos",
     "campos": [
      {
       "clave": "SITUACION",
       "texto": "Situación",
       "tipo": "lista"
      },
      {
       "clave": "NATURALEZA",
       "texto": "Naturaleza"
      },
      {
       "clave": "DERECHO",
       "texto": "Tipo de derecho"
      },
      {
       "clave": "UBICACION",
       "texto": "Municipio (provincia)",
       "enlace_mapa": true
      },
      {
       "clave": "DIRECCION",
       "texto": "Dirección (si la sabes)",
       "enlace_mapa": true
      },
      {
       "clave": "REGISTRO",
       "texto": "Registro"
      },
      {
       "clave": "CRU",
       "texto": "CRU / IDUFIR"
      },
      {
       "clave": "TITULAR",
       "texto": "Titular consultado"
      },
      {
       "clave": "CONSULTA",
       "texto": "Consulta"
      },
      {
       "clave": "OBSERVACIONES",
       "texto": "Observaciones",
       "tipo": "multilinea"
      }
     ],
     "claves_titulo": [
      "NATURALEZA",
      "SITUACION"
     ],
     "nombre_item_pdf": "FINCA",
     "texto_fotos": "Fotos de la finca"
    }
   ]
  },
  {
   "titulo": "Contacto y RRSS",
   "campos": [
    {
     "etiqueta": "TELEFONO_1",
     "texto": "Teléfono"
    },
    {
     "etiqueta": "TELEFONO_2",
     "texto": "Teléfono 2"
    },
    {
     "etiqueta": "EMAIL",
     "texto": "Email",
     "completo": true
    },
    {
     "etiqueta": "WEB",
     "texto": "Web",
     "completo": true
    },
    {
     "etiqueta": "RRSS_1",
     "texto": "RRSS 1",
     "completo": true
    },
    {
     "etiqueta": "RRSS_2",
     "texto": "RRSS 2",
     "completo": true
    }
   ]
  },
  {
   "titulo": "Trabajo",
   "campos": [
    {
     "etiqueta": "TRABAJO_EMPRESA",
     "texto": "Trabajo/Empresa",
     "completo": true
    },
    {
     "etiqueta": "TRABAJO_DIRECCION",
     "texto": "Dirección",
     "completo": true,
     "enlace_mapa": true
    },
    {
     "etiqueta": "TRABAJO_TELEFONO_1",
     "texto": "Teléfono"
    },
    {
     "etiqueta": "TRABAJO_TELEFONO_2",
     "texto": "Teléfono 2"
    },
    {
     "etiqueta": "TRABAJO_WEB",
     "texto": "Web",
     "completo": true
    },
    {
     "etiqueta": "TRABAJO_EMAIL",
     "texto": "Email",
     "completo": true
    }
   ]
  },
  {
   "titulo": "Vehículos",
   "campos": [
    {
     "etiqueta": "DETALLE_VEHICULOS",
     "texto": "Vehículos",
     "tipo": "vehiculos",
     "campos": [
      {
       "clave": "MARCA",
       "texto": "Marca"
      },
      {
       "clave": "MODELO",
       "texto": "Modelo"
      },
      {
       "clave": "MATRICULA",
       "texto": "Matrícula"
      },
      {
       "clave": "COLOR",
       "texto": "Color"
      },
      {
       "clave": "ANIO",
       "texto": "Año"
      },
      {
       "clave": "TITULAR",
       "texto": "Titular"
      },
      {
       "clave": "COTITULARES",
       "texto": "Cotitulares"
      },
      {
       "clave": "TITULAR_DESDE",
       "texto": "Titular desde"
      },
      {
       "clave": "N_TITULARES",
       "texto": "Titulares que ha tenido"
      },
      {
       "clave": "BASTIDOR",
       "texto": "Bastidor"
      },
      {
       "clave": "F_MATRICULACION",
       "texto": "Fecha de matriculación"
      },
      {
       "clave": "TIPO",
       "texto": "Tipo"
      },
      {
       "clave": "COMBUSTIBLE",
       "texto": "Combustible / potencia"
      },
      {
       "clave": "DOMICILIO",
       "texto": "Domicilio del vehículo",
       "enlace_mapa": true
      },
      {
       "clave": "DOMICILIO_TITULAR",
       "texto": "Domicilio del titular",
       "enlace_mapa": true
      },
      {
       "clave": "SEGURO",
       "texto": "Seguro"
      },
      {
       "clave": "ITV",
       "texto": "ITV"
      },
      {
       "clave": "CARGAS",
       "texto": "Cargas o gravámenes"
      },
      {
       "clave": "RENTING",
       "texto": "Renting"
      },
      {
       "clave": "ETIQUETA",
       "texto": "Etiqueta medioambiental"
      },
      {
       "clave": "KM",
       "texto": "Últimos km registrados"
      },
      {
       "clave": "INFORME_DGT",
       "texto": "Informe DGT"
      },
      {
       "clave": "OBSERVACIONES",
       "texto": "Observaciones",
       "tipo": "multilinea"
      }
     ],
     "texto_fotos": "Fotos del vehículo"
    }
   ]
  },
  {
   "titulo": "Hij@",
   "campos": [
    {
     "etiqueta": "HIJO_1_NOMBRE",
     "texto": "Nombre"
    },
    {
     "etiqueta": "HIJO_1_APELLIDOS",
     "texto": "Apellidos"
    },
    {
     "etiqueta": "HIJO_1_EDAD",
     "texto": "Edad"
    },
    {
     "etiqueta": "HIJO_1_TRABAJO_ESCUELA",
     "texto": "Trabajo / Escuela"
    },
    {
     "etiqueta": "HIJO_1_DIRECCION",
     "texto": "Dirección",
     "completo": true,
     "enlace_mapa": true
    },
    {
     "etiqueta": "HIJO_1_TELEFONO_1",
     "texto": "Teléfono"
    },
    {
     "etiqueta": "HIJO_1_TELEFONO_2",
     "texto": "Teléfono 2"
    },
    {
     "etiqueta": "FOTO_HIJO_1",
     "texto": "Fotografía",
     "tipo": "imagen"
    }
   ]
  },
  {
   "titulo": "Antecedentes e info.",
   "campos": [
    {
     "etiqueta": "ANTECEDENTES",
     "texto": "Antecedentes",
     "tipo": "multilinea"
    },
    {
     "etiqueta": "TITULO_FOTO_1",
     "texto": "Título foto adicional",
     "completo": true
    },
    {
     "etiqueta": "FOTO_ADICIONAL_1",
     "texto": "Foto adicional",
     "tipo": "imagen"
    },
    {
     "etiqueta": "INFO_ADICIONAL",
     "texto": "Información adicional",
     "tipo": "multilinea"
    }
   ]
  },
  {
   "titulo": "Historial",
   "campos": [
    {
     "etiqueta": "HISTORIAL",
     "texto": "Historial de investigación",
     "tipo": "historial",
     "campos": [
      {
       "clave": "FECHA",
       "texto": "Fecha",
       "tipo": "fecha"
      },
      {
       "clave": "HORA",
       "texto": "Hora",
       "tipo": "hora"
      },
      {
       "clave": "LUGAR",
       "texto": "Lugar",
       "completo": true,
       "enlace_mapa": true
      },
      {
       "clave": "TEXTO",
       "texto": "Descripción",
       "tipo": "multilinea"
      }
     ],
     "texto_fotos": "Fotos de esta entrada"
    }
   ]
  }
 ],
 "conocidos": [
  "ANTECEDENTES",
  "APELLIDOS",
  "AUT_DNI",
  "AUT_FECHA",
  "AUT_INTERESADO",
  "AUT_LUGAR",
  "CARPETA_EXPEDIENTE",
  "CLIENTE_APELLIDOS",
  "CLIENTE_DIRECCION",
  "CLIENTE_DNI",
  "CLIENTE_NOMBRE",
  "CLIENTE_POBLACION",
  "CLIENTE_TIPO",
  "COD_FACTURACION",
  "COD_INTERNO",
  "COLAB_AGENCIA",
  "COLAB_DNI",
  "COLAB_DOMICILIO",
  "COLAB_FECHA",
  "COLAB_FIRMA",
  "COLAB_FIRMA_DETECTIVE",
  "COLAB_INVESTIGADO",
  "COLAB_INV_DOMICILIO",
  "COLAB_LUGAR",
  "COLAB_MOTIVO",
  "COLAB_NOMBRE",
  "COLAB_PARTES",
  "COLAB_REF",
  "COLAB_RSNP",
  "COLAB_TIP",
  "COLOR_PELO",
  "CONTRATO_DESCRIPCION",
  "CONTRATO_FECHA",
  "CONTRATO_INCLUIR_DOCS",
  "CONTRATO_INVESTIGADO",
  "CONTRATO_NUMERO",
  "CONTRATO_OBJETO",
  "CONTRATO_PRESUPUESTO",
  "DETALLE_VEHICULOS",
  "DIRECCION_1",
  "DIRECCION_2",
  "DIRECCION_3",
  "DIRECCION_4",
  "DNI_NIE",
  "DOC_LEGITIMACION_1",
  "DOC_LEGITIMACION_2",
  "DOC_LEGITIMACION_3",
  "DOC_LEGITIMACION_4",
  "EDAD",
  "EMAIL",
  "EMPRESA_AUTORIZADO",
  "EMPRESA_AUTORIZADO_DNI",
  "EMPRESA_CIF",
  "EMPRESA_DIRECCION",
  "EMPRESA_NOMBRE",
  "ESTADO_CIVIL",
  "ESTATURA",
  "EXPEDIENTE",
  "EXP_EDP",
  "EXP_NUMERO",
  "FECHA",
  "FECHA_CIERRE",
  "FECHA_NAC",
  "FIRMA_CLIENTE",
  "FIRMA_DETECTIVE",
  "FOTO_ADICIONAL_1",
  "FOTO_HIJO_1",
  "FOTO_INVESTIGADO",
  "GALERIA_INVESTIGADO",
  "HIJO_1_APELLIDOS",
  "HIJO_1_DIRECCION",
  "HIJO_1_EDAD",
  "HIJO_1_NOMBRE",
  "HIJO_1_TELEFONO_1",
  "HIJO_1_TELEFONO_2",
  "HIJO_1_TRABAJO_ESCUELA",
  "HISTORIAL",
  "INFORME_ANEXO",
  "INFORME_COLABORADOR",
  "INFORME_COLABORADOR_REF",
  "INFORME_CONTRATANTE",
  "INFORME_DEFINITIVO",
  "INFORME_DELITO",
  "INFORME_DIAS",
  "INFORME_FECHA",
  "INFORME_FIRMA",
  "INFORME_INCLUIR_HUELLAS",
  "INFORME_INVESTIGADO",
  "INFORME_MEDIO",
  "INFORME_MOTIVO",
  "INFORME_ORGANO",
  "INFORME_PDF_CLAVE",
  "INFORME_REGISTRO",
  "INFORME_RESULTADOS",
  "INFORME_TIPO",
  "INFORME_VIDEO",
  "INFORME_VIDEOS",
  "INFORME_VIDEO_DURACION",
  "INFORME_VIDEO_SOPORTE",
  "INFO_ADICIONAL",
  "JUDICIALIZADO",
  "JUDICIAL_FIN",
  "JUDICIAL_PROCEDIMIENTO",
  "MASCOTA",
  "MORFOLOGIA",
  "NOMBRE",
  "NSS",
  "PESO",
  "POBLACION_1",
  "POBLACION_2",
  "POBLACION_3",
  "POBLACION_4",
  "PRESUPUESTO_1",
  "PRESUPUESTO_2",
  "PRESUPUESTO_3",
  "PRESUPUESTO_4",
  "PROPIEDADES",
  "PROPIEDADES_RESUMEN",
  "PROVINCIA_1",
  "PROVINCIA_2",
  "PROVINCIA_3",
  "PROVINCIA_4",
  "RRSS_1",
  "RRSS_2",
  "TELEFONO_1",
  "TELEFONO_2",
  "TITULO_FOTO_1",
  "TRABAJO_DIRECCION",
  "TRABAJO_EMAIL",
  "TRABAJO_EMPRESA",
  "TRABAJO_TELEFONO_1",
  "TRABAJO_TELEFONO_2",
  "TRABAJO_WEB",
  "WEB"
 ]
};
