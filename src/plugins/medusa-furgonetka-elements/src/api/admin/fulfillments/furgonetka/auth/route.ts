/*
 * Copyright 2025 Falko Team
 *
 * MIT License
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import FurgonetkaAuthService from "../../../../../services/furgonetkaAuth";

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const furgonetkaAuthService = req.scope.resolve<FurgonetkaAuthService>(
      "furgonetkaAuthService"
    );
    const result = await furgonetkaAuthService.generateToken();
    res.status(200).json(result); 
  } catch (e) {
    res.status(400).json({
        message: e.message
    })
  }
}