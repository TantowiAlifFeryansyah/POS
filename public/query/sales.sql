-- sales
CREATE OR REPLACE FUNCTION update_sales() RETURNS TRIGGER AS $set_sales$
    DECLARE
    stock_lama INTEGER;
    sum_harga NUMERIC;
    current_invoice TEXT;
    BEGIN
        IF (TG_OP = 'INSERT') THEN
            SELECT stock INTO stock_lama FROM goods WHERE barcode = NEW.itemcode;
            UPDATE goods SET stock = stock_lama - NEW.quantity WHERE barcode = NEW.itemcode;
            current_invoice := NEW.invoice;
        
        ELSIF (TG_OP = 'UPDATE') THEN
            SELECT stock INTO stock_lama FROM goods WHERE barcode = NEW.itemcode;
            UPDATE goods SET stock = stock_lama + OLD.quantity - NEW.quantity WHERE barcode = NEW.itemcode;
            current_invoice := NEW.invoice;
        
        ELSIF (TG_OP = 'DELETE') THEN
            SELECT stock INTO stock_lama FROM goods WHERE barcode = OLD.itemcode;
            UPDATE goods SET stock = stock_lama + OLD.quantity WHERE barcode = OLD.itemcode;
            current_invoice := OLD.invoice;

        END IF;
        SELECT sum(totalprice) INTO sum_harga FROM saleitems WHERE invoice = current_invoice ;
        UPDATE sales SET totalsum = sum_harga WHERE invoice = current_invoice ;

        RETURN NULL; -- result is ignored since this is an AFTER trigger
    END;
$set_sales$ LANGUAGE plpgsql;

CREATE TRIGGER set_sales
AFTER INSERT OR UPDATE OR DELETE ON saleitems
    FOR EACH ROW EXECUTE FUNCTION update_sales();

-- update sales
CREATE OR REPLACE FUNCTION update_harga_sales() RETURNS TRIGGER AS $set_total_harga$
    DECLARE
        harga_jual_barang NUMERIC;
    BEGIN
        SELECT sellingprice INTO harga_jual_barang FROM goods WHERE barcode = NEW.itemcode;
        NEW.sellingprice := harga_jual_barang;
        NEW.totalprice := NEW.quantity * NEW.sellingprice;
        RETURN NEW;
    END;
$set_total_harga$ LANGUAGE plpgsql;

CREATE TRIGGER set_total_harga
BEFORE INSERT OR UPDATE ON saleitems
    FOR EACH ROW EXECUTE FUNCTION update_harga_sales();


    -- INVOICE FORMAT
CREATE OR REPLACE FUNCTION invoice_sales() RETURNS text AS $$
    BEGIN
	IF EXISTS(SELECT invoice FROM sales WHERE invoice = 'INV-PENJ' || to_char(CURRENT_DATE, 'YYYYMMDD') || - 1) THEN
		return 'INV-PENJ' || to_char(CURRENT_DATE, 'YYYYMMDD') || - nextval('invoice_seq_sales');
	ELSE
		ALTER SEQUENCE invoice_seq_sales RESTART WITH 1;
		return 'INV-PENJ' || to_char(CURRENT_DATE, 'YYYYMMDD') || - nextval('invoice_seq_sales');
	END IF;
END;
$$ LANGUAGE plpgsql;