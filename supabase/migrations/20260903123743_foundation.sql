ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM "service_role";

CREATE SCHEMA "private";

CREATE TABLE "private"."inventory_levels" (
  "variant_id"  uuid    NOT NULL,
  "location_id" uuid    NOT NULL,
  "on_hand"     integer NOT NULL DEFAULT 0,
  "reserved"    integer NOT NULL DEFAULT 0,
  CONSTRAINT "inventory_levels_check" CHECK (((reserved >= 0) AND (reserved <= on_hand))),
  CONSTRAINT "inventory_levels_on_hand_check" CHECK ((on_hand >= 0)),
  CONSTRAINT "inventory_levels_pkey" PRIMARY KEY (variant_id, location_id)
);

ALTER TABLE "private"."inventory_levels"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "private"."inventory_locations" (
  "id"   uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" text NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "inventory_locations_code_check" CHECK (((length(btrim(code)) >= 1) AND (length(btrim(code)) <= 40))),
  CONSTRAINT "inventory_locations_code_key" UNIQUE (code),
  CONSTRAINT "inventory_locations_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120))),
  CONSTRAINT "inventory_locations_pkey" PRIMARY KEY (id)
);

ALTER TABLE "private"."inventory_locations"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "private"."staff_permissions" (
  "user_id"    uuid                     NOT NULL,
  "permission" text                     NOT NULL,
  "granted_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "staff_permissions_permission_check"
    CHECK
    ((permission = ANY (ARRAY['catalog.manage'::text, 'inventory.manage'::text, 'orders.fulfill'::text, 'customers.read'::text, 'refunds.create'::text, 'staff.manage'::text]))),
  CONSTRAINT "staff_permissions_pkey" PRIMARY KEY (user_id, permission)
);

ALTER TABLE "private"."staff_permissions"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "private"."stock_movements" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "variant_id"     uuid                     NOT NULL,
  "location_id"    uuid                     NOT NULL,
  "quantity_delta" integer                  NOT NULL,
  "reason"         text                     NOT NULL,
  "reference_key"  text                     NOT NULL,
  "actor_id"       uuid,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY (id),
  CONSTRAINT "stock_movements_quantity_delta_check" CHECK ((quantity_delta <> 0)),
  CONSTRAINT "stock_movements_reason_check" CHECK (((length(btrim(reason)) >= 1) AND (length(btrim(reason)) <= 500))),
  CONSTRAINT "stock_movements_reference_key_check" CHECK (((length(btrim(reference_key)) >= 1) AND (length(btrim(reference_key)) <= 200))),
  CONSTRAINT "stock_movements_reference_key_key" UNIQUE (reference_key)
);

ALTER TABLE "private"."stock_movements"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."addresses" (
  "id"           uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "customer_id"  uuid                     NOT NULL,
  "recipient"    text                     NOT NULL,
  "line1"        text                     NOT NULL,
  "line2"        text,
  "city"         text                     NOT NULL,
  "postal_code"  text                     NOT NULL,
  "region"       text,
  "country_code" text                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "addresses_city_check" CHECK (((length(btrim(city)) >= 1) AND (length(btrim(city)) <= 120))),
  CONSTRAINT "addresses_country_code_check" CHECK ((country_code ~ '^[A-Z]{2}$'::text)),
  CONSTRAINT "addresses_line1_check" CHECK (((length(btrim(line1)) >= 1) AND (length(btrim(line1)) <= 200))),
  CONSTRAINT "addresses_line2_check" CHECK ((length(line2) <= 200)),
  CONSTRAINT "addresses_pkey" PRIMARY KEY (id),
  CONSTRAINT "addresses_postal_code_check" CHECK (((length(btrim(postal_code)) >= 1) AND (length(btrim(postal_code)) <= 24))),
  CONSTRAINT "addresses_recipient_check" CHECK (((length(btrim(recipient)) >= 1) AND (length(btrim(recipient)) <= 160))),
  CONSTRAINT "addresses_region_check" CHECK ((length(region) <= 120))
);

ALTER TABLE "public"."addresses"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."categories" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"       text                     NOT NULL,
  "name"       text                     NOT NULL,
  "is_active"  boolean                  NOT NULL DEFAULT false,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "categories_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 120))),
  CONSTRAINT "categories_pkey" PRIMARY KEY (id),
  CONSTRAINT "categories_slug_check" CHECK (((length(slug) <= 120) AND (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))),
  CONSTRAINT "categories_slug_key" UNIQUE (slug)
);

ALTER TABLE "public"."categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_categories" (
  "product_id"  uuid NOT NULL,
  "category_id" uuid NOT NULL,
  CONSTRAINT "product_categories_pkey" PRIMARY KEY (product_id, category_id)
);

ALTER TABLE "public"."product_categories"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."product_variants" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "product_id"  uuid                     NOT NULL,
  "sku"         text                     NOT NULL,
  "size"        text                     NOT NULL,
  "color"       text                     NOT NULL,
  "price_minor" bigint                   NOT NULL,
  "currency"    text                     NOT NULL,
  "is_active"   boolean                  NOT NULL DEFAULT false,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "product_variants_color_check" CHECK (((length(btrim(color)) >= 1) AND (length(btrim(color)) <= 80))),
  CONSTRAINT "product_variants_currency_check" CHECK ((currency ~ '^[A-Z]{3}$'::text)),
  CONSTRAINT "product_variants_pkey" PRIMARY KEY (id),
  CONSTRAINT "product_variants_price_minor_check" CHECK (((price_minor >= 0) AND (price_minor <= '9007199254740991'::bigint))),
  CONSTRAINT "product_variants_product_id_size_color_key" UNIQUE (product_id, size, color),
  CONSTRAINT "product_variants_size_check" CHECK (((length(btrim(size)) >= 1) AND (length(btrim(size)) <= 40))),
  CONSTRAINT "product_variants_sku_check" CHECK ((((length(sku) >= 1) AND (length(sku) <= 80)) AND (sku ~ '^[A-Z0-9][A-Z0-9._-]*$'::text))),
  CONSTRAINT "product_variants_sku_key" UNIQUE (sku)
);

ALTER TABLE "public"."product_variants"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."products" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "slug"              text                     NOT NULL,
  "name"              text                     NOT NULL,
  "description"       text                     NOT NULL DEFAULT ''::text,
  "composition"       text                     NOT NULL DEFAULT ''::text,
  "care_instructions" text                     NOT NULL DEFAULT ''::text,
  "status"            text                     NOT NULL DEFAULT 'draft'::text,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "products_care_instructions_check" CHECK ((length(care_instructions) <= 4000)),
  CONSTRAINT "products_composition_check" CHECK ((length(composition) <= 4000)),
  CONSTRAINT "products_description_check" CHECK ((length(description) <= 10000)),
  CONSTRAINT "products_name_check" CHECK (((length(btrim(name)) >= 1) AND (length(btrim(name)) <= 160))),
  CONSTRAINT "products_pkey" PRIMARY KEY (id),
  CONSTRAINT "products_slug_check" CHECK (((length(slug) <= 160) AND (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text))),
  CONSTRAINT "products_slug_key" UNIQUE (slug),
  CONSTRAINT "products_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text])))
);

ALTER TABLE "public"."products"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."profiles" (
  "id"           uuid                     NOT NULL,
  "display_name" text                     NOT NULL,
  "created_at"   timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "profiles_display_name_check" CHECK (((length(btrim(display_name)) >= 1) AND (length(btrim(display_name)) <= 120))),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."profiles"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "private"."inventory_levels"
  ADD CONSTRAINT "inventory_levels_location_id_fkey" FOREIGN KEY (location_id) REFERENCES private.inventory_locations(id) ON DELETE RESTRICT;

ALTER TABLE "private"."staff_permissions"
  ADD CONSTRAINT "staff_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "private"."stock_movements"
  ADD CONSTRAINT "stock_movements_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE "private"."stock_movements"
  ADD CONSTRAINT "stock_movements_variant_id_location_id_fkey" FOREIGN KEY (variant_id, location_id) REFERENCES private.inventory_levels(variant_id, location_id) ON DELETE RESTRICT;

ALTER TABLE "public"."product_categories"
  ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE RESTRICT;

ALTER TABLE "private"."inventory_levels"
  ADD CONSTRAINT "inventory_levels_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES public.product_variants(id) ON DELETE RESTRICT;

ALTER TABLE "public"."product_categories"
  ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE "public"."product_variants"
  ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."addresses"
  ADD CONSTRAINT "addresses_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

CREATE INDEX inventory_levels_location_id_idx ON private.inventory_levels USING btree (location_id);

CREATE INDEX stock_movements_actor_id_idx ON private.stock_movements USING btree (actor_id);

CREATE INDEX stock_movements_variant_location_idx ON private.stock_movements USING btree (variant_id, location_id, created_at DESC);

CREATE INDEX addresses_customer_id_idx ON public.addresses USING btree (customer_id);

CREATE INDEX product_categories_category_id_idx ON public.product_categories USING btree (category_id, product_id);

CREATE INDEX products_public_listing_idx ON public.products USING btree (created_at DESC, id)
  WHERE (status = 'published'::text);

CREATE POLICY "addresses_delete_own" ON "public"."addresses"
  FOR DELETE
  TO "authenticated"
  USING ((customer_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "addresses_insert_own" ON "public"."addresses"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((customer_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "addresses_select_own" ON "public"."addresses"
  FOR SELECT
  TO "authenticated"
  USING ((customer_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "addresses_update_own" ON "public"."addresses"
  FOR UPDATE
  TO "authenticated"
  USING ((customer_id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((customer_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "categories_public_read" ON "public"."categories"
  FOR SELECT
  TO "anon", "authenticated"
  USING (is_active);

CREATE POLICY "product_categories_public_read" ON "public"."product_categories"
  FOR SELECT
  TO "anon", "authenticated"
  USING (((EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_categories.product_id) AND (p.status = 'published'::text)))) AND (EXISTS ( SELECT 1
   FROM public.categories c
  WHERE ((c.id = product_categories.category_id) AND c.is_active)))));

CREATE POLICY "variants_public_read" ON "public"."product_variants"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((is_active AND (EXISTS ( SELECT 1
   FROM public.products p
  WHERE ((p.id = product_variants.product_id) AND (p.status = 'published'::text))))));

CREATE POLICY "products_public_read" ON "public"."products"
  FOR SELECT
  TO "anon", "authenticated"
  USING ((status = 'published'::text));

CREATE POLICY "profiles_insert_own" ON "public"."profiles"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles_select_own" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "profiles_update_own" ON "public"."profiles"
  FOR UPDATE
  TO "authenticated"
  USING ((id = ( SELECT auth.uid() AS uid)))
  WITH CHECK ((id = ( SELECT auth.uid() AS uid)));

COMMENT ON SCHEMA "private" IS 'Internal operational data. Not exposed by the Data API; no browser or service-role grants yet.';

COMMENT ON TABLE "private"."staff_permissions" IS 'Server-controlled permissions. Future staff operations must check current grants and MFA; user_metadata is not authoritative.';

COMMENT ON TABLE "private"."stock_movements" IS 'Append-only through future transactional inventory functions. No application writer is enabled yet.';

COMMENT ON TABLE "public"."products" IS 'Public-safe product fields only. Description is plain text, never trusted HTML.';

GRANT CREATE, USAGE ON SCHEMA "private" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."inventory_levels" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."inventory_locations" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."staff_permissions" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "private"."stock_movements" TO "postgres";

GRANT INSERT ("city"), UPDATE ("city") ON TABLE "public"."addresses" TO "authenticated";

GRANT INSERT ("country_code"), UPDATE ("country_code") ON TABLE "public"."addresses" TO "authenticated";

GRANT INSERT ("customer_id") ON TABLE "public"."addresses" TO "authenticated";

GRANT INSERT ("line1"), UPDATE ("line1") ON TABLE "public"."addresses" TO "authenticated";

GRANT INSERT ("line2"), UPDATE ("line2") ON TABLE "public"."addresses" TO "authenticated";

GRANT INSERT ("postal_code"), UPDATE ("postal_code") ON TABLE "public"."addresses" TO "authenticated";

GRANT INSERT ("recipient"), UPDATE ("recipient") ON TABLE "public"."addresses" TO "authenticated";

GRANT INSERT ("region"), UPDATE ("region") ON TABLE "public"."addresses" TO "authenticated";

GRANT DELETE, SELECT ON TABLE "public"."addresses" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."addresses" TO "postgres";

GRANT SELECT ON TABLE "public"."categories" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."categories" TO "postgres";

GRANT SELECT ON TABLE "public"."product_categories" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_categories" TO "postgres";

GRANT SELECT ON TABLE "public"."product_variants" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."product_variants" TO "postgres";

GRANT SELECT ON TABLE "public"."products" TO "anon", "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."products" TO "postgres";

GRANT INSERT ("display_name"), UPDATE ("display_name") ON TABLE "public"."profiles" TO "authenticated";

GRANT INSERT ("id") ON TABLE "public"."profiles" TO "authenticated";

GRANT SELECT ON TABLE "public"."profiles" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."profiles" TO "postgres";

